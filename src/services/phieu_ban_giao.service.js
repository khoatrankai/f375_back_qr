const db = require("../config/database");
const { decryptData, encryptData } = require("../utils/cryptoHelper");
const { ghiNhatKy } = require("./nhat_ky.service");
const { ghiLichSuSanPham } = require("./thong_tin_san_pham.service");

// 1. Lấy danh sách phiếu (Dành cho bảng trong hình bạn vừa gửi)
const layDanhSachPhieu = (tuKhoaTimKiem = "") => {
  let sql = `
        SELECT 
            p.*,
            (SELECT COUNT(*) FROM chi_tiet_ban_giao ct WHERE ct.phieu_ban_giao_id = p.id) AS so_luong
        FROM phieu_ban_giao p
        LEFT JOIN kho tk ON p.tu_kho_id = tk.id
        LEFT JOIN kho dk ON p.den_kho_id = dk.id
        LEFT JOIN users u ON p.nguoi_nhan_id = u.id
        LEFT JOIN don_vi dv ON p.den_don_vi_id = dv.id
    `;

  if (tuKhoaTimKiem) {
    sql += ` WHERE p.ma_phieu LIKE ? `;
  }

  sql += ` ORDER BY p.created_at DESC `;

  const rows = tuKhoaTimKiem
    ? db.prepare(sql).all(`%${tuKhoaTimKiem}%`)
    : db.prepare(sql).all();

  // Xử lý logic hiển thị cho Frontend
  return rows.map((row) => {
    // Logic phân loại: Nếu từ đơn vị A sang đơn vị B -> "Bàn giao". Nếu nội bộ -> "Chuyển kho"
    let loaiPhieu = "BAN_GIAO";
    if (row.tu_don_vi_id === row.den_don_vi_id) {
      loaiPhieu = "CHUYEN_KHO";
    }

    // Format Nguồn - Đích (VD: "Kho A -> Kho B")
    // const nguonDich = `${row.tu_kho_ten || "Không rõ"} → ${row.den_kho_ten || "Không rõ"}`;

    return {
      ...row,
      loai_phieu: loaiPhieu,
    };
  });
};

// 2. Xem chi tiết 1 phiếu (Dành cho nút bấm con mắt trên UI)
const layChiTietPhieu = (id) => {
  // Lấy thông tin phiếu
  const phieu = db
    .prepare(
      `
        SELECT p.*, tk.ten_kho AS tu_kho, dk.ten_kho AS den_kho, dv.ten_don_vi AS don_vi_nhan
        FROM phieu_ban_giao p
        LEFT JOIN kho tk ON p.tu_kho_id = tk.id
        LEFT JOIN kho dk ON p.den_kho_id = dk.id
        LEFT JOIN don_vi dv ON p.den_don_vi_id = dv.id
        WHERE p.id = ?
    `,
    )
    .get(id);

  if (!phieu) return null;

  // Lấy danh sách các thiết bị trong phiếu này
  const danhSachThietBi = db
    .prepare(
      `
        SELECT ct.id AS chi_tiet_id, ct.ghi_chu_tinh_trang, 
               tb.ma_qr, tb.so_serial, tb.cap_chat_luong,
               sp.ten_san_pham
        FROM chi_tiet_ban_giao ct
        JOIN trang_bi_thuc_te tb ON ct.trang_bi_thuc_te_id = tb.id
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        WHERE ct.phieu_ban_giao_id = ?
    `,
    )
    .all(id);

  return {
    ...phieu,
    danh_sach_thiet_bi: danhSachThietBi,
  };
};

// 3. Tạo phiếu mới CÙNG VỚI danh sách thiết bị (Sử dụng Transaction an toàn)
const taoPhieuVaChiTiet = (data, danhSachTrangBiIds, reqInfo = {}) => {
  let newPhieuId;

  // Khởi tạo Transaction (Đảm bảo nếu lỗi giữa chừng thì sẽ Rollback lại toàn bộ)
  const transaction = db.transaction(() => {
    // 1. Tạo Phiếu chính
    const stmtPhieu = db.prepare(`
            INSERT INTO phieu_ban_giao (
                ma_phieu, tu_don_vi_id, den_don_vi_id, tu_kho_id, den_kho_id, 
                nguoi_ban_giao_id, nguoi_nhan_id, ngay_ban_giao, trang_thai
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

    const infoPhieu = stmtPhieu.run(
      data.ma_phieu,
      data.tu_don_vi_id || null,
      data.den_don_vi_id,
      data.tu_kho_id || null,
      data.den_kho_id || null,
      data.nguoi_ban_giao_id || null,
      data.nguoi_nhan_id || null,
      data.ngay_ban_giao || new Date().toISOString(),
      data.trang_thai || "CHO_DUYET",
    );

    newPhieuId = infoPhieu.lastInsertRowid;

    // 2. Chèn các thiết bị vào bảng chi tiết
    if (danhSachTrangBiIds && danhSachTrangBiIds.length > 0) {
      const stmtChiTiet = db.prepare(`
                INSERT INTO chi_tiet_ban_giao (phieu_ban_giao_id, trang_bi_thuc_te_id, ghi_chu_tinh_trang)
                VALUES (?, ?, ?)
            `);

      for (const tb_id of danhSachTrangBiIds) {
        stmtChiTiet.run(newPhieuId, tb_id, "Bình thường"); // Ghi chú có thể tùy chỉnh
      }
    }
  });

  transaction(); // Thực thi transaction
  ghiNhatKy(reqInfo.userId, "CREATE", "phieu_ban_giao", newPhieuId, reqInfo.ip);
  return newPhieuId;
};

// Cập nhật Phiếu bàn giao và danh sách thiết bị
const capNhatPhieu = (id, data, danhSachTrangBiIds, reqInfo = {}) => {
  const transaction = db.transaction(() => {
    // 1. Lấy thông tin phiếu hiện tại từ DB để giữ lại các trường không bị sửa
    // Tránh lỗi NOT NULL constraint
    const phieuHienTai = db
      .prepare(`SELECT * FROM phieu_ban_giao WHERE id = ?`)
      .get(id);
    if (!phieuHienTai) throw new Error("Phiếu bàn giao không tồn tại!");

    // Trộn dữ liệu mới vào dữ liệu cũ
    const den_don_vi_id =
      data.den_don_vi_id !== undefined
        ? data.den_don_vi_id
        : phieuHienTai.den_don_vi_id;
    const tu_don_vi_id =
      data.tu_don_vi_id !== undefined
        ? data.tu_don_vi_id
        : phieuHienTai.tu_don_vi_id;
    const tu_kho_id =
      data.tu_kho_id !== undefined ? data.tu_kho_id : phieuHienTai.tu_kho_id;
    const den_kho_id =
      data.den_kho_id !== undefined ? data.den_kho_id : phieuHienTai.den_kho_id;
    const nguoi_ban_giao_id =
      data.nguoi_ban_giao_id !== undefined
        ? data.nguoi_ban_giao_id
        : phieuHienTai.nguoi_ban_giao_id;
    const nguoi_nhan_id =
      data.nguoi_nhan_id !== undefined
        ? data.nguoi_nhan_id
        : phieuHienTai.nguoi_nhan_id;
    const ngay_ban_giao =
      data.ngay_ban_giao !== undefined
        ? data.ngay_ban_giao
        : phieuHienTai.ngay_ban_giao;
    const trang_thai =
      data.trang_thai !== undefined ? data.trang_thai : phieuHienTai.trang_thai;

    // 2. Cập nhật thông tin phiếu chính
    const stmtPhieu = db.prepare(`
            UPDATE phieu_ban_giao 
            SET tu_don_vi_id = ?, den_don_vi_id = ?, tu_kho_id = ?, den_kho_id = ?, 
                nguoi_ban_giao_id = ?, nguoi_nhan_id = ?, ngay_ban_giao = ?, trang_thai = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

    stmtPhieu.run(
      tu_don_vi_id || null,
      den_don_vi_id,
      tu_kho_id || null,
      den_kho_id || null,
      nguoi_ban_giao_id || null,
      nguoi_nhan_id || null,
      ngay_ban_giao,
      trang_thai,
      id,
    );

    // 3. Xử lý danh sách chi tiết (nếu Frontend có gửi mảng mới lên)
    if (danhSachTrangBiIds !== undefined) {
      // Xóa toàn bộ chi tiết cũ
      db.prepare(
        `DELETE FROM chi_tiet_ban_giao WHERE phieu_ban_giao_id = ?`,
      ).run(id);

      // Thêm lại chi tiết mới
      if (danhSachTrangBiIds.length > 0) {
        const stmtChiTiet = db.prepare(`
                    INSERT INTO chi_tiet_ban_giao (phieu_ban_giao_id, trang_bi_thuc_te_id, ghi_chu_tinh_trang)
                    VALUES (?, ?, ?)
                `);
        for (const tb_id of danhSachTrangBiIds) {
          stmtChiTiet.run(id, tb_id, "Bình thường");
        }
      }
    }

    // 4. LOGIC TỰ ĐỘNG LUÂN CHUYỂN KHO: Khi phiếu được Duyệt (HOAN_THANH)
    // Chỉ chạy nếu trạng thái cũ chưa hoàn thành mà trạng thái mới là HOAN_THANH
    if (
      trang_thai === "HOAN_THANH" &&
      phieuHienTai.trang_thai !== "HOAN_THANH"
    ) {
      // Lấy lại danh sách ID thiết bị thực tế đang có trong phiếu này (Từ database)
      const donViInfo = db
        .prepare(
          `
        SELECT dv.ten_don_vi, dv_cha.ten_don_vi AS ten_don_vi_cha
        FROM don_vi dv
        LEFT JOIN don_vi dv_cha ON dv.cap_tren_id = dv_cha.id
        WHERE dv.id = ?
      `,
        )
        .get(den_don_vi_id);

      // Tạo chuỗi tên hiển thị đẹp mắt
      let tenDonViFull = donViInfo
        ? donViInfo.ten_don_vi
        : `Đơn vị ID: ${den_don_vi_id}`;
      if (donViInfo && donViInfo.ten_don_vi_cha) {
        tenDonViFull += ` (Thuộc: ${donViInfo.ten_don_vi_cha})`;
      }
      const dsChiTiet = db
        .prepare(
          `
                SELECT trang_bi_thuc_te_id 
                FROM chi_tiet_ban_giao 
                WHERE phieu_ban_giao_id = ?
            `,
        )
        .all(id);

      // Cập nhật Kho và Đơn vị mới cho thiết bị
      const stmtChuyenKho = db.prepare(`
                UPDATE trang_bi_thuc_te 
                SET kho_id_hien_tai = ?, don_vi_quan_ly_id = ? 
                WHERE id = ?
            `);

      for (const ct of dsChiTiet) {
        stmtChuyenKho.run(
          den_kho_id || null, // Chuyển đến kho mới (nếu có)
          den_don_vi_id, // Chuyển quyền quản lý cho đơn vị mới
          ct.trang_bi_thuc_te_id,
        );
        ghiLichSuSanPham(
          ct.trang_bi_thuc_te_id,
          "BAN_GIAO",
          id,
          reqInfo.userId,
          `Bàn giao đến: ${tenDonViFull}`,
        );
      }
    }
  });

  transaction();
  ghiNhatKy(reqInfo.userId, "UPDATE", "phieu_ban_giao", id, reqInfo.ip);
  return true;
};

// Xóa Phiếu bàn giao (Xóa phiếu chính và tự động xóa chi tiết)
const xoaPhieu = (id, reqInfo = {}) => {
  // 💡 Lời khuyên nghiệp vụ: Bạn có thể check nếu trang_thai == 'HOAN_THANH' thì throw Error không cho xóa ở đây

  const transaction = db.transaction(() => {
    // 1. Xóa các chi tiết thiết bị thuộc phiếu này trước (Tránh lỗi khóa ngoại)
    db.prepare(`DELETE FROM chi_tiet_ban_giao WHERE phieu_ban_giao_id = ?`).run(
      id,
    );

    // 2. Xóa phiếu chính
    const info = db.prepare(`DELETE FROM phieu_ban_giao WHERE id = ?`).run(id);
    if (changes > 0)
      ghiNhatKy(reqInfo.userId, "DELETE", "phieu_ban_giao", id, reqInfo.ip);
    return info.changes;
  });

  return transaction();
};

const maHoaPhieuBanGiao = (id, secretKey) => {
  // A. Lấy thông tin gốc của phiếu
  const phieu = db.prepare(`SELECT * FROM phieu_ban_giao WHERE id = ?`).get(id);
  if (!phieu) throw new Error("Không tìm thấy phiếu bàn giao!");

  // B. Lấy danh sách thiết bị kèm theo toàn bộ thông tin sản phẩm VÀ DANH MỤC
  const danhSachTrangBi = db
    .prepare(
      `
        SELECT 
            ct.ghi_chu_tinh_trang,
            tb.id AS trang_bi_id, tb.ma_qr, tb.so_serial, tb.cap_chat_luong, tb.trang_thai as trang_thai_hien_tai,
            sp.ma_san_pham, sp.ten_san_pham, sp.don_vi_tinh, sp.thong_so_ky_thuat,
            dm.ten_danh_muc, dm.ma_danh_muc -- Bổ sung thêm 2 cột này từ bảng danh_muc
        FROM chi_tiet_ban_giao ct
        JOIN trang_bi_thuc_te tb ON ct.trang_bi_thuc_te_id = tb.id
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id -- JOIN thêm bảng danh_muc
        WHERE ct.phieu_ban_giao_id = ?
    `,
    )
    .all(id);

  // C. Gắn mảng thiết bị vào object phiếu
  const fullData = {
    thong_tin_phieu: phieu,
    danh_sach_thiet_bi: danhSachTrangBi,
    thoi_gian_tao_ma: new Date().toISOString(),
  };

  // D. Tiến hành mã hóa cục JSON này bằng mật khẩu
  const chuoiMaHoa = encryptData(fullData, secretKey);
  return chuoiMaHoa;
};

const giaiMaPhieuBanGiao = (chuoiMaHoa, secretKey) => {
  // Chỉ cần gọi hàm decrypt, nếu sai mật khẩu nó sẽ tự văng lỗi (catch ở controller)
  const dataGoc = decryptData(chuoiMaHoa, secretKey);
  return dataGoc;
};

module.exports = {
  layDanhSachPhieu,
  layChiTietPhieu,
  taoPhieuVaChiTiet,
  capNhatPhieu,
  xoaPhieu,
  maHoaPhieuBanGiao,
  giaiMaPhieuBanGiao,
};
