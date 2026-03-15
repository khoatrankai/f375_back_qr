const db = require("../config/database");
const { ghiNhatKy } = require("./nhat_ky.service");
const { ghiLichSuSanPham } = require("./thong_tin_san_pham.service");

// 1. Thống kê cho 3 ô Card trên cùng
const layThongKeMuonTra = () => {
  const sql = `
        SELECT 
            -- Số lượng thiết bị đang được mượn (chưa quá hạn)
            (SELECT COUNT(ct.id) 
             FROM chi_tiet_muon_tra ct 
             JOIN phieu_muon_tra p ON ct.phieu_muon_tra_id = p.id 
             WHERE p.trang_thai = 'DANG_MUON' AND p.han_tra >= date('now')) AS dang_muon,
             
            -- Số lượng thiết bị mượn đã quá hạn trả
            (SELECT COUNT(ct.id) 
             FROM chi_tiet_muon_tra ct 
             JOIN phieu_muon_tra p ON ct.phieu_muon_tra_id = p.id 
             WHERE p.trang_thai = 'DANG_MUON' AND p.han_tra < date('now')) AS qua_han,
             
            -- Số lượng phiếu đã hoàn tất trả trong tháng này
            (SELECT COUNT(id) 
             FROM phieu_muon_tra 
             WHERE trang_thai = 'DA_TRA' AND strftime('%Y-%m', ngay_tra_thuc_te) = strftime('%Y-%m', 'now')) AS da_tra_thang_nay
    `;

  return db.prepare(sql).get();
};

// 2. Lấy danh sách phiếu mượn (Đổ ra bảng)
const layDanhSachPhieuMuon = (tuKhoaTimKiem = "") => {
  let sql = `
        SELECT 
            p.*,
            p.id, 
            p.ma_phieu, 
            p.ngay_muon, 
            p.han_tra,
            p.trang_thai,
            u.full_name AS nguoi_muon,
            dv.ten_don_vi AS don_vi,
            (SELECT COUNT(*) FROM chi_tiet_muon_tra ct WHERE ct.phieu_muon_tra_id = p.id) AS so_luong,
            -- Logic SQL tự động tính Quá hạn dựa trên ngày hiện tại
            CASE 
                WHEN p.trang_thai = 'DANG_MUON' AND p.han_tra < date('now') THEN 'QUA_HAN'
                ELSE p.trang_thai 
            END AS trang_thai_hien_thi
        FROM phieu_muon_tra p
        LEFT JOIN users u ON p.nguoi_muon_id = u.id
        LEFT JOIN don_vi dv ON p.don_vi_muon_id = dv.id
    `;

  if (tuKhoaTimKiem) {
    sql += ` WHERE p.ma_phieu LIKE ? OR u.full_name LIKE ? `;
  }

  sql += ` ORDER BY p.trang_thai ASC, p.han_tra ASC, p.created_at DESC `;

  if (tuKhoaTimKiem) {
    const keyword = `%${tuKhoaTimKiem}%`;
    return db.prepare(sql).all(keyword, keyword);
  }

  return db.prepare(sql).all();
};

// 3. Xem chi tiết phiếu (Dành cho nút bấm con mắt)
const layChiTietPhieuMuon = (id) => {
  const phieu = db
    .prepare(
      `
        SELECT p.*, u.full_name AS nguoi_muon, dv.ten_don_vi AS don_vi
        FROM phieu_muon_tra p
        LEFT JOIN users u ON p.nguoi_muon_id = u.id
        LEFT JOIN don_vi dv ON p.don_vi_muon_id = dv.id
        WHERE p.id = ?
    `,
    )
    .get(id);

  if (!phieu) return null;

  const danhSachThietBi = db
    .prepare(
      `
        SELECT ct.*, tb.ma_qr, tb.so_serial, sp.ten_san_pham
        FROM chi_tiet_muon_tra ct
        JOIN trang_bi_thuc_te tb ON ct.trang_bi_thuc_te_id = tb.id
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        WHERE ct.phieu_muon_tra_id = ?
    `,
    )
    .all(id);

  return { ...phieu, danh_sach_thiet_bi: danhSachThietBi };
};

// 4. Tạo phiếu mượn (Transaction)
const taoPhieuMuon = (data, danhSachTrangBiIds, reqInfo = {}) => {
  let newPhieuId;

  const transaction = db.transaction(() => {
    // 1. Tạo phiếu
    const stmtPhieu = db.prepare(`
            INSERT INTO phieu_muon_tra (ma_phieu, nguoi_muon_id, don_vi_muon_id, ngay_muon, han_tra, trang_thai) 
            VALUES (?, ?, ?, ?, ?, 'DANG_MUON')
        `);
    const info = stmtPhieu.run(
      data.ma_phieu,
      data.nguoi_muon_id,
      data.don_vi_muon_id,
      data.ngay_muon || new Date().toISOString().split("T")[0],
      data.han_tra,
    );
    newPhieuId = info.lastInsertRowid;

    // ================= LẤY THÔNG TIN NGƯỜI / ĐƠN VỊ MƯỢN =================
    let tenNguoiMuon = "";
    if (phieuData.nguoi_muon_id) {
      const user = db
        .prepare(`SELECT full_name FROM users WHERE id = ?`)
        .get(phieuData.nguoi_muon_id);
      if (user) tenNguoiMuon = user.full_name;
    }

    let tenDonViMuon = "";
    if (phieuData.don_vi_muon_id) {
      const dv = db
        .prepare(`SELECT ten_don_vi FROM don_vi WHERE id = ?`)
        .get(phieuData.don_vi_muon_id);
      if (dv) tenDonViMuon = dv.ten_don_vi;
    }

    // Tạo câu ghi chú động tùy theo việc mượn cá nhân hay mượn tập thể
    let ghiChuLichSu = "Cho mượn";
    if (tenNguoiMuon && tenDonViMuon) {
      ghiChuLichSu = `Cho mượn: ${tenNguoiMuon} (Thuộc: ${tenDonViMuon})`;
    } else if (tenNguoiMuon) {
      ghiChuLichSu = `Cho cá nhân mượn: ${tenNguoiMuon}`;
    } else if (tenDonViMuon) {
      ghiChuLichSu = `Cho đơn vị mượn: ${tenDonViMuon}`;
    }
    // =====================================================================
    // 2. Thêm chi tiết & Cập nhật trạng thái thiết bị thành DANG_MUON
    if (danhSachTrangBiIds && danhSachTrangBiIds.length > 0) {
      const stmtChiTiet = db.prepare(
        `INSERT INTO chi_tiet_muon_tra (phieu_muon_tra_id, trang_bi_thuc_te_id) VALUES (?, ?)`,
      );
      const stmtCapNhatTB = db.prepare(
        `UPDATE trang_bi_thuc_te SET trang_thai = 'DANG_MUON' WHERE id = ?`,
      );

      for (const tb_id of danhSachTrangBiIds) {
        stmtChiTiet.run(newPhieuId, tb_id);
        ghiLichSuSanPham(
          tb_id,
          "CHO_MUON",
          newPhieuId,
          reqInfo.userId,
          ghiChuLichSu, // <--- Truyền biến này vào
        );
        stmtCapNhatTB.run(tb_id); // Khóa thiết bị lại, không cho người khác mượn hay xuất kho nữa
      }
    }
  });

  transaction();
  ghiNhatKy(reqInfo.userId, "CREATE", "phieu_muon_tra", newPhieuId, reqInfo.ip);
  return newPhieuId;
};

// 5. Xử lý Trả thiết bị (Nút TRẢ trên giao diện)
const traThietBi = (phieuId, reqInfo = {}) => {
  const transaction = db.transaction(() => {
    // 1. Lấy danh sách thiết bị trong phiếu này
    const thietBiIds = db
      .prepare(
        `SELECT trang_bi_thuc_te_id FROM chi_tiet_muon_tra WHERE phieu_muon_tra_id = ?`,
      )
      .all(phieuId);

    // 2. Trả thiết bị về kho (Cập nhật trạng thái)
    const stmtCapNhatTB = db.prepare(
      `UPDATE trang_bi_thuc_te SET trang_thai = 'TRONG_KHO' WHERE id = ?`,
    );
    for (const item of thietBiIds) {
      stmtCapNhatTB.run(item.trang_bi_thuc_te_id);
    }

    // 3. Cập nhật phiếu thành Đã trả
    const stmtPhieu = db.prepare(
      `UPDATE phieu_muon_tra SET trang_thai = 'DA_TRA', ngay_tra_thuc_te = date('now') WHERE id = ?`,
    );
    stmtPhieu.run(phieuId);
  });

  transaction();
  ghiNhatKy(reqInfo.userId, "UPDATE", "phieu_muon_tra", phieuId, reqInfo.ip);
  return true;
};

module.exports = {
  layThongKeMuonTra,
  layDanhSachPhieuMuon,
  layChiTietPhieuMuon,
  taoPhieuMuon,
  traThietBi,
};
