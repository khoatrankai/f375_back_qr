const db = require("../config/database");
const { decryptData, encryptData } = require("../utils/cryptoHelper");
const { ghiNhatKy } = require("./nhat_ky.service");
const {
  layTonKhoChiTiet,
  ghiLichSuSanPham,
} = require("./thong_tin_san_pham.service");
const taoMaTuTen = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD") // Phân tách các ký tự có dấu
    .replace(/[\u0300-\u036f]/g, "") // Xóa bỏ các dấu
    .replace(/đ/g, "d") // Chuyển chữ đ
    .replace(/[^a-z0-9\s-]/g, "") // Xóa các ký tự đặc biệt
    .trim()
    .replace(/\s+/g, "_"); // Thay khoảng trắng bằng dấu gạch dưới
};
// Lấy danh sách toàn bộ kho (kèm thông tin Đơn vị quản lý và Số lượng trang bị)
const layTatCaKho = () => {
  const sql = `
        SELECT 
            k.*,
            dv.ma_don_vi,
            dv.ten_don_vi,
            (SELECT COUNT(*) FROM trang_bi_thuc_te tb WHERE tb.kho_id_hien_tai = k.id) AS so_luong_trang_bi
        FROM kho k
        LEFT JOIN don_vi dv ON k.don_vi_id = dv.id
        ORDER BY k.created_at DESC
    `;

  const rows = db.prepare(sql).all();

  return rows.map((row) => {
    const { ma_don_vi, ten_don_vi, so_luong_trang_bi, ...khoData } = row;

    khoData.so_luong_trang_bi = so_luong_trang_bi || 0;

    if (khoData.don_vi_id) {
      khoData.don_vi_quan_ly = {
        id: khoData.don_vi_id,
        ma_don_vi: ma_don_vi,
        ten_don_vi: ten_don_vi,
      };
    } else {
      khoData.don_vi_quan_ly = null;
    }

    return khoData;
  });
};

const layTatCaKhoByDV = (id) => {
  const sql = `
        SELECT 
            k.*,
            (SELECT COUNT(*) FROM trang_bi_thuc_te tb WHERE tb.kho_id_hien_tai = k.id) AS so_luong_trang_bi
        FROM kho k
        LEFT JOIN don_vi dv ON k.don_vi_id = dv.id
        WHERE dv.id = ?
        ORDER BY k.created_at DESC
    `;

  const rows = db.prepare(sql).all(id);

  return rows.map((row) => {
    const { ma_don_vi, ten_don_vi, so_luong_trang_bi, ...khoData } = row;

    khoData.so_luong_trang_bi = so_luong_trang_bi || 0;

    if (khoData.don_vi_id) {
      khoData.don_vi_quan_ly = {
        id: khoData.don_vi_id,
        ma_don_vi: ma_don_vi,
        ten_don_vi: ten_don_vi,
      };
    } else {
      khoData.don_vi_quan_ly = null;
    }

    return khoData;
  });
};

// Lấy thông tin 1 kho theo ID
const layKhoTheoId = (id) => {
  const sql = `
        SELECT 
            k.*,
            dv.ma_don_vi,
            dv.ten_don_vi,
            (SELECT COUNT(*) FROM trang_bi_thuc_te tb WHERE tb.kho_id_hien_tai = k.id) AS so_luong_trang_bi
        FROM kho k
        LEFT JOIN don_vi dv ON k.don_vi_id = dv.id
        WHERE k.id = ?
    `;

  const row = db.prepare(sql).get(id);
  if (!row) return null;

  const { ma_don_vi, ten_don_vi, so_luong_trang_bi, ...khoData } = row;

  khoData.so_luong_trang_bi = so_luong_trang_bi || 0;

  if (khoData.don_vi_id) {
    khoData.don_vi_quan_ly = {
      id: khoData.don_vi_id,
      ma_don_vi: ma_don_vi,
      ten_don_vi: ten_don_vi,
    };
  } else {
    khoData.don_vi_quan_ly = null;
  }

  return khoData;
};

// Thêm mới kho
const taoKho = (data, reqInfo = {}) => {
  const stmt = db.prepare(`
        INSERT INTO kho (ma_kho, ten_kho, don_vi_id, vi_tri, suc_chua) 
        VALUES (?, ?, ?, ?, ?)
    `);
  const info = stmt.run(
    data.ma_kho,
    data.ten_kho,
    data.don_vi_id || null,
    data.vi_tri || null,
    data.suc_chua || 0, // Mặc định là 0 nếu không truyền lên
  );
  ghiNhatKy(reqInfo.userId, "CREATE", "kho", info.lastInsertRowid, reqInfo.ip);
  return info.lastInsertRowid;
};

// Cập nhật thông tin kho (Đã bổ sung suc_chua)
const capNhatKho = (id, data, reqInfo = {}) => {
  const stmt = db.prepare(`
        UPDATE kho 
        SET ma_kho = ?, ten_kho = ?, don_vi_id = ?, vi_tri = ?, suc_chua = ? 
        WHERE id = ?
    `);
  const info = stmt.run(
    data.ma_kho,
    data.ten_kho,
    data.don_vi_id || null,
    data.vi_tri || null,
    data.suc_chua || 0, // Cập nhật lại sức chứa
    id,
  );
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "UPDATE", "kho", id, reqInfo.ip);
  return info.changes;
};

// Xóa kho
const xoaKho = (id, reqInfo = {}) => {
  const stmt = db.prepare("DELETE FROM kho WHERE id = ?");
  const info = stmt.run(id);
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "DELETE", "kho", id, reqInfo.ip);
  return info.changes;
};

const layThongKeTheKho = () => {
  const sql = `
        SELECT 
            k.id, k.ma_kho, k.ten_kho, k.suc_chua,
            dv.ten_don_vi,
            
            -- Đếm tổng số lượng cái/chiếc đang có trong kho
            (SELECT COUNT(*) FROM trang_bi_thuc_te tb WHERE tb.kho_id_hien_tai = k.id AND tb.trang_thai = 'TRONG_KHO') AS tong_so_luong,
            
            -- Tính TỔNG THỂ TÍCH (Sức chứa đã dùng) bằng cách: SUM(số lượng * thể tích từng món)
            (
                SELECT COALESCE(SUM(sp.the_tich), 0)
                FROM trang_bi_thuc_te tb
                JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
                WHERE tb.kho_id_hien_tai = k.id AND tb.trang_thai = 'TRONG_KHO'
            ) AS dung_luong_da_dung
            
        FROM kho k
        LEFT JOIN don_vi dv ON k.don_vi_id = dv.id
        ORDER BY k.ma_kho ASC
    `;

  const rows = db.prepare(sql).all();

  return rows.map((row) => {
    // Tính phần trăm công suất: (Dung lượng đã dùng / Tổng sức chứa kho) * 100
    let percent = 0;
    if (row.suc_chua > 0) {
      percent = Math.round((row.dung_luong_da_dung / row.suc_chua) * 100);
    }

    return {
      id: row.id,
      ma_kho: row.ma_kho,
      ten_kho: row.ten_kho,
      don_vi_quan_ly: row.ten_don_vi || "Chưa gắn đơn vị",

      tong_so_luong: row.tong_so_luong, // Trả về số lượng cái/chiếc thực tế
      dung_luong_da_dung: row.dung_luong_da_dung, // Trả về con số 0.5 (như VD của bạn)
      suc_chua_toi_da: row.suc_chua, // Trả về con số 580 (như VD của bạn)
      phan_tram_cong_suat: percent, // Để vẽ thanh Progress Bar
    };
  });
};

// 2. API cho Tab "Phiếu nhập / xuất" (Hình 4)
const layLichSuPhieuKho = () => {
  const sql = `
        SELECT 
            pk.id, pk.ma_phieu, pk.loai_phieu, pk.created_at, pk.ghi_chu,
            k.ten_kho,
            u.username AS nguoi_lap,
            (SELECT COUNT(*) FROM chi_tiet_phieu_kho ct WHERE ct.phieu_kho_id = pk.id) AS so_luong
        FROM phieu_kho pk
        LEFT JOIN kho k ON pk.kho_id = k.id
        LEFT JOIN users u ON pk.nguoi_lap_id = u.id
        ORDER BY pk.created_at DESC
    `;

  return db.prepare(sql).all();
};

const layDanhSachTonKho = () => {
  const sql = `
        SELECT 
            sp.id AS san_pham_id,
            sp.ten_san_pham,
            dm.ten_danh_muc AS loai_san_pham,
            k.id AS kho_id,
            k.ten_kho,
            tk.so_luong_cap1 AS so_luong_cap1,
            tk.so_luong_cap2 AS so_luong_cap2,
            tk.so_luong_cap3 AS so_luong_cap3,
            tk.so_luong_cap4 AS so_luong_cap4,
            -- Cộng tổng 4 cấp lại thành cột 'tong_cong'
            (tk.so_luong_cap1 + tk.so_luong_cap2 + tk.so_luong_cap3 + tk.so_luong_cap4) AS tong_cong
        FROM ton_kho tk
        JOIN thong_tin_san_pham sp ON tk.thong_tin_sp_id = sp.id
        LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
        JOIN kho k ON tk.kho_id = k.id
        -- Chỉ lấy những dòng có tồn kho lớn hơn 0 để giao diện đỡ rác
        WHERE (tk.so_luong_cap1 + tk.so_luong_cap2 + tk.so_luong_cap3 + tk.so_luong_cap4) > 0
        ORDER BY sp.ten_san_pham ASC, k.ten_kho ASC
    `;

  return db.prepare(sql).all();
};

// Lấy tồn kho của 1 sản phẩm cụ thể trên các kho (Phục vụ ấn mở rộng > ở Hình 3)
const layTonKhoTheoSanPham = (spId) => {
  const sql = `
        SELECT 
            k.id AS kho_id,
            k.ten_kho,
            dv.ten_don_vi AS don_vi_quan_ly,
            tk.so_luong_cap1 AS so_luong_cap1,
            tk.so_luong_cap2 AS so_luong_cap2,
            tk.so_luong_cap3 AS so_luong_cap3,
            tk.so_luong_cap4 AS so_luong_cap4,
            (tk.so_luong_cap1 + tk.so_luong_cap2 + tk.so_luong_cap3 + tk.so_luong_cap4) AS tong_cong
        FROM ton_kho tk
        JOIN kho k ON tk.kho_id = k.id
        LEFT JOIN don_vi dv ON k.don_vi_id = dv.id
        WHERE tk.thong_tin_sp_id = ?
        ORDER BY k.ten_kho ASC
    `;

  const rows = db.prepare(sql).all(spId);

  // Tính tổng để ra phần trăm phân bổ
  const tongTonKhoToanHeThong = rows.reduce(
    (sum, row) => sum + row.tong_cong,
    0,
  );

  return rows.map((row) => {
    const phanBoPercent =
      tongTonKhoToanHeThong === 0
        ? 0
        : Math.round((row.tong_cong / tongTonKhoToanHeThong) * 100);

    return {
      ...row,
      don_vi_quan_ly: row.don_vi_quan_ly || "Không xác định",
      phan_bo: phanBoPercent,
    };
  });
};

const layDanhSachKhoChiTiet = (tuKhoaTimKiem = "") => {
  let sql = `
        SELECT 
            k.id, 
            k.ma_kho, 
            k.ten_kho, 
            k.vi_tri, 
            k.suc_chua AS suc_chua_toi_da,
            dv.id AS don_vi_id,
            dv.ten_don_vi AS don_vi_quan_ly,
            -- Tính TỔNG THỂ TÍCH (Sức chứa đã dùng) hiện tại của kho
            (
                SELECT COALESCE(SUM(sp.the_tich), 0)
                FROM trang_bi_thuc_te tb
                JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
                WHERE tb.kho_id_hien_tai = k.id AND tb.trang_thai = 'TRONG_KHO'
            ) AS dang_chua
            
        FROM kho k
        LEFT JOIN don_vi dv ON k.don_vi_id = dv.id
    `;

  // Nếu có từ khóa tìm kiếm (theo mã kho hoặc tên kho)
  if (tuKhoaTimKiem) {
    sql += ` WHERE k.ma_kho LIKE ? OR k.ten_kho LIKE ? `;
  }

  sql += ` ORDER BY k.created_at DESC `;

  // Thực thi câu lệnh
  let rows;
  if (tuKhoaTimKiem) {
    const keyword = `%${tuKhoaTimKiem}%`;
    rows = db.prepare(sql).all(keyword, keyword);
  } else {
    rows = db.prepare(sql).all();
  }

  // Format lại dữ liệu và tính phần trăm công suất để Frontend dùng luôn
  return rows.map((row) => {
    let percent = 0;
    if (row.suc_chua_toi_da > 0) {
      percent = Math.round((row.dang_chua / row.suc_chua_toi_da) * 100);
    }

    return {
      id: row.id,
      ma_kho: row.ma_kho,
      ten_kho: row.ten_kho,
      vi_tri: row.vi_tri || "Chưa cập nhật",
      don_vi_id: row.don_vi_id || "Chưa gắn đơn vị",
      don_vi_quan_ly: row.don_vi_quan_ly || "Chưa gắn đơn vị",
      dang_chua: row.dang_chua,
      suc_chua: row.suc_chua_toi_da,
      phan_tram_cong_suat: percent,
    };
  });
};

const nhapKhoMoi = (phieuData, danhSachTrangBi, reqInfo = {}) => {
  let ketQua = { phieu_kho_id: null, danh_sach_qr: [] };

  const transaction = db.transaction(() => {
    // 1. Tạo Phiếu Nhập Kho
    const stmtPhieu = db.prepare(`
        INSERT INTO phieu_kho (ma_phieu, loai_phieu, kho_id, nguoi_lap_id, ghi_chu)
        VALUES (?, 'NHAP_KHO', ?, ?, ?)
    `);
    const infoPhieu = stmtPhieu.run(
      phieuData.ma_phieu,
      phieuData.kho_id,
      phieuData.nguoi_lap_id || null,
      phieuData.ghi_chu || "",
    );
    const phieuId = infoPhieu.lastInsertRowid;
    ketQua.phieu_kho_id = phieuId;

    const khoInfo = db
      .prepare(
        `
        SELECT k.ten_kho, dv.ten_don_vi 
        FROM kho k
        LEFT JOIN don_vi dv ON k.don_vi_id = dv.id
        WHERE k.id = ?
    `,
      )
      .get(phieuData.kho_id);

    let tenKhoFull = khoInfo ? khoInfo.ten_kho : `Kho ID: ${phieuData.kho_id}`;
    if (khoInfo && khoInfo.ten_don_vi) {
      tenKhoFull += ` (Thuộc: ${khoInfo.ten_don_vi})`;
    }
    // 2. Chuẩn bị các Statement để lặp (Giúp tối ưu hiệu suất)
    const stmtTrangBi = db.prepare(`
        INSERT INTO trang_bi_thuc_te (
            thong_tin_sp_id, so_serial, ma_qr, cap_chat_luong, 
            kho_id_hien_tai, don_vi_quan_ly_id, trang_thai
        ) VALUES (?, ?, ?, ?, ?, ?, 'TRONG_KHO')
    `);

    const stmtChiTietPhieu = db.prepare(`
        INSERT INTO chi_tiet_phieu_kho (phieu_kho_id, trang_bi_thuc_te_id)
        VALUES (?, ?)
    `);

    // UPSERT: Tự động cộng dồn số lượng vào bảng ton_kho
    const stmtTonKho = db.prepare(`
        INSERT INTO ton_kho (kho_id, thong_tin_sp_id, so_luong_cap1, so_luong_cap2, so_luong_cap3, so_luong_cap4)
        VALUES (?, ?, 
            CASE WHEN ? = 1 THEN 1 ELSE 0 END,
            CASE WHEN ? = 2 THEN 1 ELSE 0 END,
            CASE WHEN ? = 3 THEN 1 ELSE 0 END,
            CASE WHEN ? = 4 THEN 1 ELSE 0 END
        )
        ON CONFLICT(kho_id, thong_tin_sp_id) DO UPDATE SET
            so_luong_cap1 = so_luong_cap1 + CASE WHEN ? = 1 THEN 1 ELSE 0 END,
            so_luong_cap2 = so_luong_cap2 + CASE WHEN ? = 2 THEN 1 ELSE 0 END,
            so_luong_cap3 = so_luong_cap3 + CASE WHEN ? = 3 THEN 1 ELSE 0 END,
            so_luong_cap4 = so_luong_cap4 + CASE WHEN ? = 4 THEN 1 ELSE 0 END,
            updated_at = CURRENT_TIMESTAMP
    `);

    // Statement phụ lấy tên SP để trả về in tem
    const stmtTenSP = db.prepare(
      `SELECT ten_san_pham FROM thong_tin_san_pham WHERE id = ?`,
    );

    // 3. Lặp qua danh sách thiết bị cần nhập
    for (const item of danhSachTrangBi) {
      // Nếu Frontend không gửi mã QR, Backend tự sinh mã ngẫu nhiên
      const maQR =
        item.ma_qr || `QR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const capCL = item.cap_chat_luong || 1;

      // A. Tạo cá thể thực tế
      const infoTB = stmtTrangBi.run(
        item.thong_tin_sp_id,
        item.so_serial || null,
        maQR,
        capCL,
        phieuData.kho_id, // Gắn vào kho đang nhập
        phieuData.don_vi_quan_ly_id || null,
      );
      const tbId = infoTB.lastInsertRowid;

      // B. Liên kết vào chi tiết phiếu kho
      stmtChiTietPhieu.run(phieuId, tbId);
      ghiLichSuSanPham(
        tbId,
        "NHAP_KHO",
        phieuId,
        reqInfo.userId,
        `Nhập vào: ${tenKhoFull}`, // <--- Dùng cái tên đã lấy ở trên
      );
      // C. Cập nhật bảng tồn kho tổng hợp
      stmtTonKho.run(
        phieuData.kho_id,
        item.thong_tin_sp_id,
        capCL,
        capCL,
        capCL,
        capCL, // Biến cho phần INSERT
        capCL,
        capCL,
        capCL,
        capCL, // Biến cho phần DO UPDATE
      );

      // D. Thu thập dữ liệu để trả về cho Frontend đi in tem
      const sp = stmtTenSP.get(item.thong_tin_sp_id);
      ketQua.danh_sach_qr.push({
        trang_bi_id: tbId,
        thong_tin_sp_id: item.thong_tin_sp_id,
        ten_san_pham: sp ? sp.ten_san_pham : "Không xác định",
        so_serial: item.so_serial || "—",
        ma_qr: maQR,
        cap_chat_luong: capCL,
      });
    }
  });

  transaction(); // Thực thi transaction
  if (ketQua.phieu_kho_id) {
    ghiNhatKy(
      reqInfo.userId,
      "CREATE",
      "phieu_kho",
      ketQua.phieu_kho_id,
      reqInfo.ip,
    );
  }
  return ketQua;
};

const xuatKho = (phieuData, danhSachTrangBiIds, reqInfo = {}) => {
  const transaction = db.transaction(() => {
    // 1. Tạo Phiếu Xuất Kho
    const stmtPhieu = db.prepare(`
        INSERT INTO phieu_kho (ma_phieu, loai_phieu, kho_id, nguoi_lap_id, ghi_chu)
        VALUES (?, 'XUAT_KHO', ?, ?, ?)
    `);
    const infoPhieu = stmtPhieu.run(
      phieuData.ma_phieu,
      phieuData.kho_id,
      phieuData.nguoi_lap_id || null,
      phieuData.ghi_chu || "",
    );
    const phieuId = infoPhieu.lastInsertRowid;

    // 2. Chuẩn bị các câu lệnh lặp
    const stmtLayThongTinTB = db.prepare(`
        SELECT thong_tin_sp_id, cap_chat_luong 
        FROM trang_bi_thuc_te 
        WHERE id = ? AND kho_id_hien_tai = ? AND trang_thai = 'TRONG_KHO'
    `);

    const stmtCapNhatTB = db.prepare(`
        UPDATE trang_bi_thuc_te 
        SET trang_thai = 'DA_XUAT', kho_id_hien_tai = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `);

    const stmtChiTietPhieu = db.prepare(`
        INSERT INTO chi_tiet_phieu_kho (phieu_kho_id, trang_bi_thuc_te_id)
        VALUES (?, ?)
    `);

    const stmtTruTonKho = db.prepare(`
        UPDATE ton_kho 
        SET 
            so_luong_cap1 = so_luong_cap1 - CASE WHEN ? = 1 THEN 1 ELSE 0 END,
            so_luong_cap2 = so_luong_cap2 - CASE WHEN ? = 2 THEN 1 ELSE 0 END,
            so_luong_cap3 = so_luong_cap3 - CASE WHEN ? = 3 THEN 1 ELSE 0 END,
            so_luong_cap4 = so_luong_cap4 - CASE WHEN ? = 4 THEN 1 ELSE 0 END,
            updated_at = CURRENT_TIMESTAMP
        WHERE kho_id = ? AND thong_tin_sp_id = ?
    `);

    // ================== LẤY TÊN KHO XUẤT ==================
    const khoInfo = db
      .prepare(
        `
        SELECT k.ten_kho, dv.ten_don_vi 
        FROM kho k
        LEFT JOIN don_vi dv ON k.don_vi_id = dv.id
        WHERE k.id = ?
    `,
      )
      .get(phieuData.kho_id);

    let tenKhoFull = khoInfo ? khoInfo.ten_kho : `Kho ID: ${phieuData.kho_id}`;
    if (khoInfo && khoInfo.ten_don_vi) {
      tenKhoFull += ` (Thuộc: ${khoInfo.ten_don_vi})`;
    }

    // 3. Xử lý từng thiết bị được chọn để xuất
    for (const tbId of danhSachTrangBiIds) {
      // A. Kiểm tra xem thiết bị có hợp lệ để xuất không (còn trong kho không)
      const tb = stmtLayThongTinTB.get(tbId, phieuData.kho_id);
      if (!tb) {
        throw new Error(
          `Thiết bị có ID ${tbId} không tồn tại trong kho này hoặc đã được xuất/mượn!`,
        );
      }

      // B. Cập nhật trạng thái cá thể thiết bị -> 'DA_XUAT' và rời khỏi kho
      stmtCapNhatTB.run(tbId);

      // C. Lưu vào chi tiết phiếu xuất
      stmtChiTietPhieu.run(phieuId, tbId);
      ghiLichSuSanPham(
        tbId,
        "XUAT_KHO",
        phieuId,
        reqInfo.userId,
        `Xuất khỏi: ${tenKhoFull}`, // <--- Ghi rõ tên kho
      );
      // D. Trừ dồn số lượng trong bảng tồn kho
      stmtTruTonKho.run(
        tb.cap_chat_luong,
        tb.cap_chat_luong,
        tb.cap_chat_luong,
        tb.cap_chat_luong, // Biến cho CASE
        phieuData.kho_id,
        tb.thong_tin_sp_id,
      );
    }

    return phieuId;
  });
  if (phieuId) {
    ghiNhatKy(reqInfo.userId, "CREATE", "phieu_kho", phieuId, reqInfo.ip);
  }
  return transaction(); // Trả về ID của phiếu xuất vừa tạo
};

const layChiTietPhieuKho = (phieuId) => {
  // 1. Lấy thông tin chung của phiếu
  const phieu = db
    .prepare(
      `
        SELECT pk.*, k.ten_kho, k.ma_kho, u.full_name AS nguoi_lap
        FROM phieu_kho pk
        LEFT JOIN kho k ON pk.kho_id = k.id
        LEFT JOIN users u ON pk.nguoi_lap_id = u.id
        WHERE pk.id = ?
    `,
    )
    .get(phieuId);

  if (!phieu) return null;

  // 2. Lấy danh sách các trang bị thực tế nằm trong phiếu này
  const danhSachTrangBi = db
    .prepare(
      `
        SELECT 
            ct.id AS chi_tiet_id,
            tb.id AS trang_bi_id,
            tb.ma_qr,
            tb.so_serial,
            tb.cap_chat_luong,
            sp.id AS san_pham_id,
            sp.ma_san_pham,
            sp.ten_san_pham,
            sp.don_vi_tinh
        FROM chi_tiet_phieu_kho ct
        JOIN trang_bi_thuc_te tb ON ct.trang_bi_thuc_te_id = tb.id
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        WHERE ct.phieu_kho_id = ?
        ORDER BY sp.ten_san_pham ASC
    `,
    )
    .all(phieuId);

  return {
    ...phieu,
    tong_so_luong: danhSachTrangBi.length,
    danh_sach_trang_bi: danhSachTrangBi,
  };
};

// ================= LẤY CHI TIẾT PHIẾU KHO (Dùng cho cả NHẬP và XUẤT) =================
const layChiTietPhieuKhoQR = (phieuId) => {
  // 1. Lấy thông tin chung của phiếu (kèm tên kho và người lập)
  const phieu = db
    .prepare(
      `
        SELECT 
            pk.id, pk.ma_phieu, pk.loai_phieu, pk.created_at, pk.ghi_chu,
            pk.kho_id, k.ten_kho,
            pk.nguoi_lap_id, u.full_name AS nguoi_lap
        FROM phieu_kho pk
        LEFT JOIN kho k ON pk.kho_id = k.id
        LEFT JOIN users u ON pk.nguoi_lap_id = u.id
        WHERE pk.id = ?
    `,
    )
    .get(phieuId);

  if (!phieu) {
    throw new Error("Không tìm thấy phiếu kho này!");
  }

  // 2. Lấy danh sách thiết bị thực tế có trong phiếu + Thông tin dòng sản phẩm
  const danhSachThietBi = db
    .prepare(
      `
        SELECT 
            tb.id AS trang_bi_id, 
            tb.ma_qr, 
            tb.so_serial, 
            tb.cap_chat_luong, 
            tb.trang_thai AS trang_thai_hien_tai,
            sp.id AS thong_tin_sp_id,
            sp.ma_san_pham, 
            sp.ten_san_pham, 
            sp.don_vi_tinh, 
            sp.thong_so_ky_thuat,
            dm.ten_danh_muc
        FROM chi_tiet_phieu_kho ct
        JOIN trang_bi_thuc_te tb ON ct.trang_bi_thuc_te_id = tb.id
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
        WHERE ct.phieu_kho_id = ?
    `,
    )
    .all(phieuId);

  // 3. Đóng gói trả về
  return {
    thong_tin_phieu: phieu,
    danh_sach_thiet_bi: danhSachThietBi,
  };
};

const maHoaPhieuKho = (phieuId, secretKey) => {
  // Gọi lại hàm lấy chi tiết có sẵn
  const dataPhieu = layChiTietPhieuKhoQR(phieuId);

  // Gắn thêm timestamp để biết mã này tạo lúc nào
  const fullData = {
    ...dataPhieu,
    thoi_gian_tao_ma: new Date().toISOString(),
  };

  // Mã hóa toàn bộ cục JSON (đã nén)
  return encryptData(fullData, secretKey);
};

// 2. Giải mã chuỗi bảo mật về lại JSON ban đầu
const giaiMaPhieuKho = (chuoiMaHoa, secretKey) => {
  return decryptData(chuoiMaHoa, secretKey);
};

const nhapKhoTuMaHoa = (
  cryptoString,
  secretKey,
  khoNhanId,
  nguoiLapId,
  reqInfo = {},
) => {
  // 1. Giải mã dữ liệu
  const dataGoc = decryptData(cryptoString, secretKey);
  if (
    !dataGoc ||
    !dataGoc.danh_sach_thiet_bi ||
    dataGoc.danh_sach_thiet_bi.length === 0
  ) {
    throw new Error(
      "Dữ liệu giải mã không hợp lệ hoặc phiếu không có thiết bị nào!",
    );
  }

  const danhSachThietBi = dataGoc.danh_sach_thiet_bi;
  const phieuXuatGoc = dataGoc.thong_tin_phieu;

  let ketQua = { phieu_kho_id: null, so_luong_nhap: 0 };

  const transaction = db.transaction(() => {
    // Lấy tên kho nhận để ghi lịch sử
    const khoInfo = db
      .prepare(
        `SELECT k.ten_kho, dv.ten_don_vi FROM kho k LEFT JOIN don_vi dv ON k.don_vi_id = dv.id WHERE k.id = ?`,
      )
      .get(khoNhanId);
    let tenKhoFull = khoInfo ? khoInfo.ten_kho : `Kho ID: ${khoNhanId}`;
    if (khoInfo && khoInfo.ten_don_vi)
      tenKhoFull += ` (Thuộc: ${khoInfo.ten_don_vi})`;

    // Tạo Phiếu Nhập
    const maPhieuNhap = `NK-${Date.now()}`;
    const ghiChu = `Nhập tự động qua QR từ phiếu xuất: ${phieuXuatGoc.ma_phieu}`;
    const stmtPhieu = db.prepare(
      `INSERT INTO phieu_kho (ma_phieu, loai_phieu, kho_id, nguoi_lap_id, ghi_chu) VALUES (?, 'NHAP_KHO', ?, ?, ?)`,
    );
    ketQua.phieu_kho_id = stmtPhieu.run(
      maPhieuNhap,
      khoNhanId,
      nguoiLapId || null,
      ghiChu,
    ).lastInsertRowid;

    // ================= CHUẨN BỊ CÁC LỆNH SQL CHECK & TẠO MỚI (UPSERT) =================
    const checkDanhMuc = db.prepare(
      `SELECT id FROM danh_muc WHERE ten_danh_muc = ?`,
    );
    const insertDanhMuc = db.prepare(
      `INSERT INTO danh_muc (ten_danh_muc, ma_danh_muc) VALUES (?, ?)`,
    );

    const checkSanPham = db.prepare(
      `SELECT id FROM thong_tin_san_pham WHERE ma_san_pham = ?`,
    );
    const insertSanPham = db.prepare(
      `INSERT INTO thong_tin_san_pham (ma_san_pham, ten_san_pham, danh_muc_id, don_vi_tinh, thong_so_ky_thuat) VALUES (?, ?, ?, ?, ?)`,
    );

    const checkThietBi = db.prepare(
      `SELECT id FROM trang_bi_thuc_te WHERE ma_qr = ?`,
    );
    const insertThietBi = db.prepare(
      `INSERT INTO trang_bi_thuc_te (thong_tin_sp_id, so_serial, ma_qr, cap_chat_luong, kho_id_hien_tai, trang_thai) VALUES (?, ?, ?, ?, ?, 'TRONG_KHO')`,
    );
    const updateThietBi = db.prepare(
      `UPDATE trang_bi_thuc_te SET trang_thai = 'TRONG_KHO', kho_id_hien_tai = ?, cap_chat_luong = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );

    const stmtChiTietPhieu = db.prepare(
      `INSERT INTO chi_tiet_phieu_kho (phieu_kho_id, trang_bi_thuc_te_id) VALUES (?, ?)`,
    );

    // Tồn kho
    const checkTonKho = db.prepare(
      `SELECT 1 FROM ton_kho WHERE kho_id = ? AND thong_tin_sp_id = ?`,
    );
    const insertTonKho = db.prepare(
      `INSERT INTO ton_kho (kho_id, thong_tin_sp_id, so_luong_cap1, so_luong_cap2, so_luong_cap3, so_luong_cap4) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const updateTonKho = db.prepare(
      `UPDATE ton_kho SET so_luong_cap1 = so_luong_cap1 + CASE WHEN ? = 1 THEN 1 ELSE 0 END, so_luong_cap2 = so_luong_cap2 + CASE WHEN ? = 2 THEN 1 ELSE 0 END, so_luong_cap3 = so_luong_cap3 + CASE WHEN ? = 3 THEN 1 ELSE 0 END, so_luong_cap4 = so_luong_cap4 + CASE WHEN ? = 4 THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE kho_id = ? AND thong_tin_sp_id = ?`,
    );

    // ================= VÒNG LẶP XỬ LÝ TỪNG THIẾT BỊ =================
    for (const tb of danhSachThietBi) {
      // Bước 1: Xử lý Danh Mục (Tạo nếu chưa có)
      let finalDanhMucId = null;
      if (tb.ten_danh_muc) {
        const dm = checkDanhMuc.get(tb.ten_danh_muc);
        if (dm) {
          finalDanhMucId = dm.id;
        } else {
          // SỬA ĐOẠN NÀY: Sinh mã danh mục tự động và truyền vào lệnh run
          const maDanhMucMoi = taoMaTuTen(tb.ten_danh_muc);
          finalDanhMucId = insertDanhMuc.run(
            tb.ten_danh_muc,
            maDanhMucMoi,
          ).lastInsertRowid;
          ghiNhatKy(
            reqInfo.userId,
            "CREATE",
            "danh_muc",
            finalDanhMucId,
            reqInfo.ip,
          );
        }
      }

      // Bước 2: Xử lý Sản Phẩm chung (Tạo nếu chưa có)
      let finalSpId = null;
      const sp = checkSanPham.get(tb.ma_san_pham);
      if (sp) {
        finalSpId = sp.id;
      } else {
        finalSpId = insertSanPham.run(
          tb.ma_san_pham,
          tb.ten_san_pham,
          finalDanhMucId,
          tb.don_vi_tinh || "Cái",
          tb.thong_so_ky_thuat || "",
        ).lastInsertRowid;
        ghiNhatKy(
          reqInfo.userId,
          "CREATE",
          "thong_tin_san_pham",
          finalSpId,
          reqInfo.ip,
        );
      }

      // Bước 3: Xử lý Cá thể Thiết bị (Tạo mới hoặc Cập nhật chuyển kho)
      let finalTrangBiId = null;
      let isTaoMoiThietBi = false;
      const thietBiHienTai = checkThietBi.get(tb.ma_qr);

      if (thietBiHienTai) {
        finalTrangBiId = thietBiHienTai.id;
        updateThietBi.run(khoNhanId, tb.cap_chat_luong, finalTrangBiId); // Đã có trên hệ thống -> Cập nhật sang kho mới
      } else {
        // Chưa có trên hệ thống -> Thêm cá thể mới hoàn toàn
        finalTrangBiId = insertThietBi.run(
          finalSpId,
          tb.so_serial || null,
          tb.ma_qr,
          tb.cap_chat_luong || 1,
          khoNhanId,
        ).lastInsertRowid;
        isTaoMoiThietBi = true;
        ghiNhatKy(
          reqInfo.userId,
          "CREATE",
          "trang_bi_thuc_te",
          finalTrangBiId,
          reqInfo.ip,
        );
      }

      // Bước 4: Lưu vào chi tiết phiếu kho
      stmtChiTietPhieu.run(ketQua.phieu_kho_id, finalTrangBiId);

      // Bước 5: Cập nhật Tồn Kho (Theo ID sản phẩm mới/cũ)
      if (checkTonKho.get(khoNhanId, finalSpId)) {
        updateTonKho.run(
          tb.cap_chat_luong,
          tb.cap_chat_luong,
          tb.cap_chat_luong,
          tb.cap_chat_luong,
          khoNhanId,
          finalSpId,
        );
      } else {
        insertTonKho.run(
          khoNhanId,
          finalSpId,
          tb.cap_chat_luong === 1 ? 1 : 0,
          tb.cap_chat_luong === 2 ? 1 : 0,
          tb.cap_chat_luong === 3 ? 1 : 0,
          tb.cap_chat_luong === 4 ? 1 : 0,
        );
      }

      // Bước 6: Ghi lịch sử sản phẩm
      if (isTaoMoiThietBi) {
        ghiLichSuSanPham(
          finalTrangBiId,
          "TAO_MOI",
          ketQua.phieu_kho_id,
          reqInfo.userId,
          `Khởi tạo tự động từ mã QR liên kho`,
        );
      }
      ghiLichSuSanPham(
        finalTrangBiId,
        "NHAP_KHO",
        ketQua.phieu_kho_id,
        reqInfo.userId,
        `Nhập vào: ${tenKhoFull} (Từ mã QR phiếu: ${phieuXuatGoc.ma_phieu})`,
      );

      ketQua.so_luong_nhap++;
    }
  });

  transaction();

  // Ghi log phiếu nhập
  ghiNhatKy(
    reqInfo.userId,
    "CREATE",
    "phieu_kho",
    ketQua.phieu_kho_id,
    reqInfo.ip,
  );

  return ketQua;
};

const nhapKhoExcel = (payload, reqInfo = {}) => {
  const { phieu_data, danh_sach_trang_bi } = payload;

  if (!phieu_data || !danh_sach_trang_bi || danh_sach_trang_bi.length === 0) {
    throw new Error(
      "Dữ liệu payload không hợp lệ hoặc danh sách trang bị trống!",
    );
  }

  let ketQua = { phieu_kho_id: null, so_luong_nhap: 0 };

  const transaction = db.transaction(() => {
    // 1. Lấy tên kho nhận để ghi lịch sử
    const khoInfo = db
      .prepare(
        `SELECT k.ten_kho, dv.ten_don_vi FROM kho k LEFT JOIN don_vi dv ON k.don_vi_id = dv.id WHERE k.id = ?`,
      )
      .get(phieu_data.kho_id);
    let tenKhoFull = khoInfo ? khoInfo.ten_kho : `Kho ID: ${phieu_data.kho_id}`;
    if (khoInfo && khoInfo.ten_don_vi)
      tenKhoFull += ` (Thuộc: ${khoInfo.ten_don_vi})`;

    // 2. Tạo Phiếu Nhập
    const stmtPhieu = db.prepare(
      `INSERT INTO phieu_kho (ma_phieu, loai_phieu, kho_id, nguoi_lap_id, ghi_chu, created_at) VALUES (?, 'NHAP_KHO', ?, ?, ?, ?)`,
    );
    // Lấy ngày thực hiện hoặc lấy ngày hiện tại
    const ngayTao = phieu_data.ngay_thuc_hien || new Date().toISOString();
    const infoPhieu = stmtPhieu.run(
      phieu_data.ma_phieu,
      phieu_data.kho_id,
      phieu_data.nguoi_lap_id || null,
      phieu_data.ghi_chu || "",
      ngayTao,
    );
    ketQua.phieu_kho_id = infoPhieu.lastInsertRowid;

    // ================= CÁC LỆNH SQL KIỂM TRA & THÊM MỚI =================
    const checkDanhMuc = db.prepare(
      `SELECT id FROM danh_muc WHERE ten_danh_muc = ?`,
    );
    const insertDanhMuc = db.prepare(
      `INSERT INTO danh_muc (ten_danh_muc, ma_danh_muc) VALUES (?, ?)`,
    );

    const checkSanPham = db.prepare(
      `SELECT id FROM thong_tin_san_pham WHERE ma_san_pham = ?`,
    );
    const insertSanPham = db.prepare(
      `INSERT INTO thong_tin_san_pham (ma_san_pham, ten_san_pham, danh_muc_id, don_vi_tinh, thong_so_ky_thuat) VALUES (?, ?, ?, ?, ?)`,
    );

    const checkThietBi = db.prepare(
      `SELECT id FROM trang_bi_thuc_te WHERE ma_qr = ?`,
    );
    const insertThietBi = db.prepare(
      `INSERT INTO trang_bi_thuc_te (thong_tin_sp_id, so_serial, ma_qr, cap_chat_luong, kho_id_hien_tai, trang_thai) VALUES (?, ?, ?, ?, ?, 'TRONG_KHO')`,
    );
    const updateThietBi = db.prepare(
      `UPDATE trang_bi_thuc_te SET trang_thai = 'TRONG_KHO', kho_id_hien_tai = ?, cap_chat_luong = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );

    const stmtChiTietPhieu = db.prepare(
      `INSERT INTO chi_tiet_phieu_kho (phieu_kho_id, trang_bi_thuc_te_id) VALUES (?, ?)`,
    );

    const checkTonKho = db.prepare(
      `SELECT 1 FROM ton_kho WHERE kho_id = ? AND thong_tin_sp_id = ?`,
    );
    const insertTonKho = db.prepare(
      `INSERT INTO ton_kho (kho_id, thong_tin_sp_id, so_luong_cap1, so_luong_cap2, so_luong_cap3, so_luong_cap4) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const updateTonKho = db.prepare(
      `UPDATE ton_kho SET so_luong_cap1 = so_luong_cap1 + CASE WHEN ? = 1 THEN 1 ELSE 0 END, so_luong_cap2 = so_luong_cap2 + CASE WHEN ? = 2 THEN 1 ELSE 0 END, so_luong_cap3 = so_luong_cap3 + CASE WHEN ? = 3 THEN 1 ELSE 0 END, so_luong_cap4 = so_luong_cap4 + CASE WHEN ? = 4 THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE kho_id = ? AND thong_tin_sp_id = ?`,
    );

    // ================= VÒNG LẶP XỬ LÝ DANH SÁCH =================
    for (const tb of danh_sach_trang_bi) {
      // Bước 1: Danh mục
      let finalDanhMucId = null;
      if (tb.ten_danh_muc) {
        const dm = checkDanhMuc.get(tb.ten_danh_muc);
        if (dm) finalDanhMucId = dm.id;
        else {
          finalDanhMucId = insertDanhMuc.run(
            tb.ten_danh_muc,
            taoMaTuTen(tb.ten_danh_muc),
          ).lastInsertRowid;
          ghiNhatKy(
            reqInfo.userId,
            "CREATE",
            "danh_muc",
            finalDanhMucId,
            reqInfo.ip,
          );
        }
      }

      // Bước 2: Sản phẩm
      let finalSpId = tb.thong_tin_sp_id || null;
      if (!finalSpId && tb.ma_san_pham) {
        const sp = checkSanPham.get(tb.ma_san_pham);
        if (sp) finalSpId = sp.id;
        else {
          finalSpId = insertSanPham.run(
            tb.ma_san_pham,
            tb.ten_san_pham || tb.ma_san_pham,
            finalDanhMucId,
            tb.don_vi_tinh || "Cái",
            tb.thong_so_ky_thuat || "",
          ).lastInsertRowid;
          ghiNhatKy(
            reqInfo.userId,
            "CREATE",
            "thong_tin_san_pham",
            finalSpId,
            reqInfo.ip,
          );
        }
      }
      if (!finalSpId)
        throw new Error(`Lỗi: Không có mã sản phẩm cho QR ${tb.ma_qr}`);

      // Bước 3: Thiết bị
      let finalTrangBiId = null;
      let isTaoMoiThietBi = false;
      let capChatLuong = tb.cap_chat_luong || 1;
      const thietBiHienTai = checkThietBi.get(tb.ma_qr);

      if (thietBiHienTai) {
        finalTrangBiId = thietBiHienTai.id;
        updateThietBi.run(phieu_data.kho_id, capChatLuong, finalTrangBiId);
      } else {
        finalTrangBiId = insertThietBi.run(
          finalSpId,
          tb.so_serial || null,
          tb.ma_qr,
          capChatLuong,
          phieu_data.kho_id,
        ).lastInsertRowid;
        isTaoMoiThietBi = true;
        ghiNhatKy(
          reqInfo.userId,
          "CREATE",
          "trang_bi_thuc_te",
          finalTrangBiId,
          reqInfo.ip,
        );
      }

      // Bước 4: Chi tiết phiếu kho
      stmtChiTietPhieu.run(ketQua.phieu_kho_id, finalTrangBiId);

      // Bước 5: Tồn kho
      if (checkTonKho.get(phieu_data.kho_id, finalSpId)) {
        updateTonKho.run(
          capChatLuong,
          capChatLuong,
          capChatLuong,
          capChatLuong,
          phieu_data.kho_id,
          finalSpId,
        );
      } else {
        insertTonKho.run(
          phieu_data.kho_id,
          finalSpId,
          capChatLuong === 1 ? 1 : 0,
          capChatLuong === 2 ? 1 : 0,
          capChatLuong === 3 ? 1 : 0,
          capChatLuong === 4 ? 1 : 0,
        );
      }

      // Bước 6: Lịch sử
      if (isTaoMoiThietBi)
        ghiLichSuSanPham(
          finalTrangBiId,
          "TAO_MOI",
          ketQua.phieu_kho_id,
          reqInfo.userId,
          `Khởi tạo thiết bị qua Nhập kho thông minh`,
        );
      ghiLichSuSanPham(
        finalTrangBiId,
        "NHAP_KHO",
        ketQua.phieu_kho_id,
        reqInfo.userId,
        `Nhập vào: ${tenKhoFull} (Mã phiếu: ${phieu_data.ma_phieu})`,
      );

      ketQua.so_luong_nhap++;
    }
  });

  transaction();
  ghiNhatKy(
    reqInfo.userId,
    "CREATE",
    "phieu_kho",
    ketQua.phieu_kho_id,
    reqInfo.ip,
  );
  return ketQua;
};

module.exports = {
  layTatCaKho,
  layKhoTheoId,
  taoKho,
  capNhatKho,
  xoaKho,
  layLichSuPhieuKho,
  layThongKeTheKho,
  layTonKhoTheoSanPham,
  layTonKhoChiTiet,
  layDanhSachTonKho,
  layDanhSachKhoChiTiet,
  layTatCaKhoByDV,
  nhapKhoMoi,
  layChiTietPhieuKho,
  xuatKho,
  layChiTietPhieuKhoQR,
  maHoaPhieuKho,
  giaiMaPhieuKho,
  nhapKhoTuMaHoa,
  nhapKhoExcel,
};
