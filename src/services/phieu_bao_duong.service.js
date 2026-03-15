const db = require("../config/database");
const { ghiNhatKy } = require("./nhat_ky.service");
const { ghiLichSuSanPham } = require("./thong_tin_san_pham.service");

// 1. Lấy danh sách phiếu bảo dưỡng (Đổ ra bảng giao diện)
const layDanhSachPhieuBD = (tuKhoaTimKiem = "") => {
  let sql = `
        SELECT 
            p.id, 
            p.ma_phieu, 
            p.ngay_bat_dau, 
            p.ngay_hoan_thanh, 
            p.trang_thai,
            lcv.ten_loai_cv AS loai_cong_viec,
            u.full_name AS phu_trach,

            (SELECT COUNT(*) FROM chi_tiet_bao_duong ct WHERE ct.phieu_bao_duong_id = p.id) AS so_luong,
            -- Lấy thông tin thiết bị đầu tiên làm đại diện cho dòng
            (SELECT sp.ten_san_pham 
             FROM chi_tiet_bao_duong ct 
             JOIN trang_bi_thuc_te tb ON ct.trang_bi_thuc_te_id = tb.id 
             JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id 
             WHERE ct.phieu_bao_duong_id = p.id LIMIT 1) AS thiet_bi,
            
            -- Lấy cấp chất lượng trước/sau (để vẽ sao trên UI)
            (SELECT ct.cap_chat_luong_truoc FROM chi_tiet_bao_duong ct WHERE ct.phieu_bao_duong_id = p.id LIMIT 1) AS cap_truoc,
            (SELECT ct.cap_chat_luong_sau FROM chi_tiet_bao_duong ct WHERE ct.phieu_bao_duong_id = p.id LIMIT 1) AS cap_sau
            
        FROM phieu_bao_duong p
        LEFT JOIN loai_cong_viec lcv ON p.loai_cong_viec_id = lcv.id
        LEFT JOIN users u ON p.nguoi_phu_trach_id = u.id
    `;

  if (tuKhoaTimKiem) {
    sql += ` WHERE p.ma_phieu LIKE ? OR thiet_bi LIKE ? `;
  }

  sql += ` ORDER BY p.created_at DESC `;

  if (tuKhoaTimKiem) {
    const keyword = `%${tuKhoaTimKiem}%`;
    return db.prepare(sql).all(keyword, keyword);
  }

  return db.prepare(sql).all();
};

// 2. Lấy chi tiết 1 phiếu (Nút con mắt trên UI)
const layChiTietPhieuBD = (id) => {
  const phieu = db
    .prepare(
      `
        SELECT p.*, lcv.ten_loai_cv, u.full_name AS phu_trach
        FROM phieu_bao_duong p
        LEFT JOIN loai_cong_viec lcv ON p.loai_cong_viec_id = lcv.id
        LEFT JOIN users u ON p.nguoi_phu_trach_id = u.id
        WHERE p.id = ?
    `,
    )
    .get(id);

  if (!phieu) return null;

  const danhSachThietBi = db
    .prepare(
      `
        SELECT 
            ct.id AS chi_tiet_id, ct.noi_dung_thuc_hien, 
            ct.cap_chat_luong_truoc, ct.cap_chat_luong_sau,
            tb.id AS trang_bi_id, tb.ma_qr, tb.so_serial, 
            sp.ten_san_pham
        FROM chi_tiet_bao_duong ct
        JOIN trang_bi_thuc_te tb ON ct.trang_bi_thuc_te_id = tb.id
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        WHERE ct.phieu_bao_duong_id = ?
    `,
    )
    .all(id);

  return { ...phieu, danh_sach_thiet_bi: danhSachThietBi };
};

// 3. Tạo phiếu bảo dưỡng mới
const taoPhieuBD = (data, danhSachTrangBiIds, reqInfo = {}) => {
  let newPhieuId;

  const transaction = db.transaction(() => {
    // 1. Lưu phiếu chính
    const stmtPhieu = db.prepare(`
            INSERT INTO phieu_bao_duong (ma_phieu, loai_cong_viec_id, nguoi_phu_trach_id, ngay_bat_dau, trang_thai) 
            VALUES (?, ?, ?, ?, 'DANG_XU_LY')
        `);
    const info = stmtPhieu.run(
      data.ma_phieu,
      data.loai_cong_viec_id,
      data.nguoi_phu_trach_id,
      data.ngay_bat_dau || new Date().toISOString().split("T")[0],
    );
    newPhieuId = info.lastInsertRowid;

    // 2. Lưu chi tiết & "Chụp" cấp chất lượng hiện tại & Chuyển trạng thái
    if (danhSachTrangBiIds && danhSachTrangBiIds.length > 0) {
      const stmtLấyCapHienTai = db.prepare(
        `SELECT cap_chat_luong FROM trang_bi_thuc_te WHERE id = ?`,
      );
      const stmtChiTiet = db.prepare(`
                INSERT INTO chi_tiet_bao_duong (phieu_bao_duong_id, trang_bi_thuc_te_id, cap_chat_luong_truoc) 
                VALUES (?, ?, ?)
            `);
      const stmtCapNhatTB = db.prepare(
        `UPDATE trang_bi_thuc_te SET trang_thai = 'DANG_BAO_DUONG' WHERE id = ?`,
      );

      for (const tb_id of danhSachTrangBiIds) {
        // Lấy cấp hiện tại
        const tb = stmtLấyCapHienTai.get(tb_id);
        const capTruoc = tb ? tb.cap_chat_luong : 1;

        // Thêm vào chi tiết phiếu bảo dưỡng
        stmtChiTiet.run(newPhieuId, tb_id, capTruoc);
        ghiLichSuSanPham(
          tb_id,
          "BAT_DAU_BAO_DUONG",
          newPhieuId,
          reqInfo.userId,
          `Đưa đi bảo dưỡng/sửa chữa`,
        );
        // Khóa thiết bị lại
        stmtCapNhatTB.run(tb_id);
      }
    }
  });

  transaction();
  ghiNhatKy(
    reqInfo.userId,
    "CREATE",
    "phieu_bao_duong",
    newPhieuId,
    reqInfo.ip,
  );
  return newPhieuId;
};

// 4. Hoàn thành bảo dưỡng (Cập nhật Cấp sau và trả về kho)
const hoanThanhBD = (phieuId, ketQuaBaoDuong, reqInfo = {}) => {
  // ketQuaBaoDuong là mảng: [{ chi_tiet_id: 1, cap_chat_luong_sau: 2, noi_dung_thuc_hien: "Đã thay pin" }]
  const transaction = db.transaction(() => {
    const stmtCapNhatChiTiet = db.prepare(`
            UPDATE chi_tiet_bao_duong 
            SET cap_chat_luong_sau = ?, noi_dung_thuc_hien = ? 
            WHERE id = ? AND phieu_bao_duong_id = ?
        `);

    const stmtLấyTrangBiId = db.prepare(
      `SELECT trang_bi_thuc_te_id FROM chi_tiet_bao_duong WHERE id = ?`,
    );

    const stmtCapNhatTB = db.prepare(`
            UPDATE trang_bi_thuc_te 
            SET trang_thai = 'TRONG_KHO', cap_chat_luong = ? 
            WHERE id = ?
        `);

    // Duyệt qua từng kết quả bảo dưỡng user gửi lên
    for (const item of ketQuaBaoDuong) {
      // 1. Cập nhật chi tiết phiếu (Lưu cấp sau)
      stmtCapNhatChiTiet.run(
        item.cap_chat_luong_sau,
        item.noi_dung_thuc_hien || null,
        item.chi_tiet_id,
        phieuId,
      );

      // 2. Tìm ID của thiết bị thực tế
      const ct = stmtLấyTrangBiId.get(item.chi_tiet_id);
      if (ct) {
        // 3. Đưa thiết bị về kho và set cấp chất lượng mới
        stmtCapNhatTB.run(item.cap_chat_luong_sau, ct.trang_bi_thuc_te_id);
      }
      ghiLichSuSanPham(
        ct.trang_bi_thuc_te_id,
        "HOAN_THANH_BAO_DUONG",
        id,
        reqInfo.userId,
        `Đã bảo dưỡng xong và trả về kho`,
      );
    }

    // Đóng phiếu bảo dưỡng
    const stmtPhieu = db.prepare(`
            UPDATE phieu_bao_duong 
            SET trang_thai = 'HOAN_THANH', ngay_hoan_thanh = date('now') 
            WHERE id = ?
        `);
    stmtPhieu.run(phieuId);
  });

  transaction();
  ghiNhatKy(reqInfo.userId, "UPDATE", "phieu_bao_duong", id, reqInfo.ip);
  return true;
};

module.exports = {
  layDanhSachPhieuBD,
  layChiTietPhieuBD,
  taoPhieuBD,
  hoanThanhBD,
};
