const db = require("../config/database");
const {
  getChiTietVaLichSuByQR,
} = require("../controllers/thong_tin_san_pham.controller");
const { encryptData, decryptData } = require("../utils/cryptoHelper");
const { ghiNhatKy } = require("./nhat_ky.service");

// 1. Lấy thông kê tổng quan (Cho 4 ô Card trên cùng)
const layThongKeTongQuan = () => {
  const sql = `
        SELECT 
            COUNT(id) AS tong_ca_the,
            SUM(CASE WHEN trang_thai = 'TRONG_KHO' THEN 1 ELSE 0 END) AS trong_kho,
            SUM(CASE WHEN trang_thai = 'DANG_MUON' THEN 1 ELSE 0 END) AS dang_muon,
            SUM(CASE WHEN trang_thai = 'DANG_BAO_DUONG' THEN 1 ELSE 0 END) AS bao_duong
        FROM trang_bi_thuc_te
    `;

  const row = db.prepare(sql).get();
  return {
    tong_ca_the: row.tong_ca_the || 0,
    trong_kho: row.trong_kho || 0,
    dang_muon: row.dang_muon || 0,
    bao_duong: row.bao_duong || 0,
  };
};

// 2. Lấy danh sách sản phẩm hiển thị chuẩn theo giao diện ảnh (Danh sách bên dưới)
const layTatCaSanPham = () => {
  // Sử dụng LEFT JOIN và GROUP BY để gom nhóm số lượng thực tế
  const sql = `
        SELECT 
            sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.don_vi_tinh, sp.thong_so_ky_thuat,
            dm.ten_danh_muc,
            dm.id as danh_muc_id,
            sp.the_tich,
            COUNT(tb.id) AS tong_so,
            SUM(CASE WHEN tb.trang_thai = 'TRONG_KHO' THEN 1 ELSE 0 END) AS so_luong_trong_kho,
            SUM(CASE WHEN tb.trang_thai = 'DANG_MUON' THEN 1 ELSE 0 END) AS so_luong_dang_muon,
            SUM(CASE WHEN tb.trang_thai = 'DANG_BAO_DUONG' THEN 1 ELSE 0 END) AS so_luong_bao_duong,
            (
                SELECT GROUP_CONCAT(DISTINCT k.ten_kho)
                FROM trang_bi_thuc_te t2
                JOIN kho k ON t2.kho_id_hien_tai = k.id
                WHERE t2.thong_tin_sp_id = sp.id
            ) AS danh_sach_kho_chua
        FROM thong_tin_san_pham sp
        LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
        LEFT JOIN trang_bi_thuc_te tb ON tb.thong_tin_sp_id = sp.id
        GROUP BY sp.id
        ORDER BY sp.created_at DESC
    `;

  const rows = db.prepare(sql).all();

  return rows.map((row) => {
    // SQLite GROUP_CONCAT trả về chuỗi cách nhau dấu phẩy VD: "Kho A,Kho B".
    // Ta cần tách nó thành Mảng (Array) để Frontend dễ render các thẻ tag xanh xanh.
    const khoArray = row.danh_sach_kho_chua
      ? row.danh_sach_kho_chua.split(",")
      : [];

    return {
      id: row.id,
      ma_san_pham: row.ma_san_pham,
      ten_san_pham: row.ten_san_pham,
      ten_danh_muc: row.ten_danh_muc,
      danh_muc_id: row.danh_muc_id,
      don_vi_tinh: row.don_vi_tinh,
      thong_so_ky_thuat: row.thong_so_ky_thuat,
      thong_ke: {
        trong_kho: row.so_luong_trong_kho || 0,
        dang_muon: row.so_luong_dang_muon || 0,
        bao_duong: row.so_luong_bao_duong || 0,
        tong_so: row.tong_so || 0,
      },
      danh_sach_kho: khoArray,
      the_tich: row?.the_tich,
    };
  });
};

// 3. Lấy thông tin 1 sản phẩm chi tiết
const laySanPhamTheoId = (id) => {
  return db.prepare("SELECT * FROM thong_tin_san_pham WHERE id = ?").get(id);
};

// const laySanPhamTheoQR = (qr) => {
//   return db.prepare("SELECT * FROM thong_tin_san_pham WHERE ma = ?").get(id);
// };

// 4. Thêm sản phẩm
const taoSanPham = (data, reqInfo = {}) => {
  const stmt = db.prepare(`
        INSERT INTO thong_tin_san_pham (ma_san_pham, ten_san_pham, danh_muc_id, don_vi_tinh, thong_so_ky_thuat, the_tich) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);
  const info = stmt.run(
    data.ma_san_pham,
    data.ten_san_pham,
    data.danh_muc_id || null,
    data.don_vi_tinh,
    data.thong_so_ky_thuat,
    data.the_tich || 0, // Mặc định là 0 nếu không truyền lên
  );
  ghiNhatKy(
    reqInfo.userId,
    "CREATE",
    "thong_tin_san_pham",
    info.lastInsertRowid,
    reqInfo.ip,
  );
  return info.lastInsertRowid;
};

// 5. Cập nhật sản phẩm
const capNhatSanPham = (id, data, reqInfo = {}) => {
  const stmt = db.prepare(`
        UPDATE thong_tin_san_pham 
        SET ma_san_pham = ?, ten_san_pham = ?, danh_muc_id = ?, don_vi_tinh = ?, thong_so_ky_thuat = ?, the_tich = ?
        WHERE id = ?
    `);
  const info = stmt.run(
    data.ma_san_pham,
    data.ten_san_pham,
    data.danh_muc_id || null,
    data.don_vi_tinh,
    data.thong_so_ky_thuat,
    data.the_tich || 0, // Cập nhật lại thể tích
    id,
  );
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "UPDATE", "thong_tin_san_pham", id, reqInfo.ip);
  return info.changes;
};

// 6. Xóa sản phẩm
const xoaSanPham = (id, reqInfo = {}) => {
  const stmt = db.prepare("DELETE FROM thong_tin_san_pham WHERE id = ?");
  const info = stmt.run(id);
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "DELETE", "thong_tin_san_pham", id, reqInfo.ip);
  return info.changes;
};

const layTonKhoChiTiet = () => {
  // Chỉ đếm những thiết bị đang có trạng thái 'TRONG_KHO'
  const sql = `
        SELECT 
            sp.id AS san_pham_id,
            sp.ten_san_pham,
            dm.ten_danh_muc AS loai_san_pham,
            k.id AS kho_id,
            k.ten_kho,
            SUM(CASE WHEN tb.cap_chat_luong = 1 THEN 1 ELSE 0 END) AS so_luong_cap1,
            SUM(CASE WHEN tb.cap_chat_luong = 2 THEN 1 ELSE 0 END) AS so_luong_cap2,
            SUM(CASE WHEN tb.cap_chat_luong = 3 THEN 1 ELSE 0 END) AS so_luong_cap3,
            SUM(CASE WHEN tb.cap_chat_luong = 4 THEN 1 ELSE 0 END) AS so_luong_cap4,
            COUNT(tb.id) AS tong_cong
        FROM thong_tin_san_pham sp
        LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
        JOIN trang_bi_thuc_te tb ON tb.thong_tin_sp_id = sp.id
        JOIN kho k ON tb.kho_id_hien_tai = k.id
        WHERE tb.trang_thai = 'TRONG_KHO'
        GROUP BY sp.id, k.id
        ORDER BY sp.created_at DESC, k.ten_kho ASC
    `;

  return db.prepare(sql).all();
};

const layPhanBoKhoTheoSanPham = (spId) => {
  const sql = `
        SELECT 
            k.id AS kho_id,
            k.ten_kho,
            dv.ten_don_vi AS don_vi_quan_ly,
            SUM(CASE WHEN tb.cap_chat_luong = 1 THEN 1 ELSE 0 END) AS cap_1,
            SUM(CASE WHEN tb.cap_chat_luong = 2 THEN 1 ELSE 0 END) AS cap_2,
            SUM(CASE WHEN tb.cap_chat_luong = 3 THEN 1 ELSE 0 END) AS cap_3,
            SUM(CASE WHEN tb.cap_chat_luong = 4 THEN 1 ELSE 0 END) AS cap_4,
            COUNT(tb.id) AS tong_cong
        FROM trang_bi_thuc_te tb
        JOIN kho k ON tb.kho_id_hien_tai = k.id
        LEFT JOIN don_vi dv ON k.don_vi_id = dv.id
        WHERE tb.thong_tin_sp_id = ? AND tb.trang_thai = 'TRONG_KHO'
        GROUP BY k.id, k.ten_kho, dv.ten_don_vi
        ORDER BY k.ten_kho ASC
    `;

  const rows = db.prepare(sql).all(spId);

  // Tính tổng tất cả thiết bị của sản phẩm này trên toàn hệ thống để chia phần trăm
  const tongTonKhoToanHeThong = rows.reduce(
    (sum, row) => sum + row.tong_cong,
    0,
  );

  // Map lại dữ liệu và thêm trường phan_bo (%)
  return rows.map((row) => {
    // Tránh lỗi chia cho 0 nếu kho trống
    const phanBoPercent =
      tongTonKhoToanHeThong === 0
        ? 0
        : Math.round((row.tong_cong / tongTonKhoToanHeThong) * 100);

    return {
      kho_id: row.kho_id,
      ten_kho: row.ten_kho,
      don_vi_quan_ly: row.don_vi_quan_ly || "Không xác định",
      so_luong_cap1: row.so_luong_cap1 || 0,
      so_luong_cap2: row.so_luong_cap2 || 0,
      so_luong_cap3: row.so_luong_cap3 || 0,
      so_luong_cap4: row.so_luong_cap4 || 0,
      tong_cong: row.tong_cong || 0,
      phan_bo: phanBoPercent,
    };
  });
};

const layDanhSachTrangBiTungCai = (
  tuKhoaTimKiem = "",
  trangThai = "",
  khoId = "",
) => {
  let sql = `
        SELECT 
            tb.id AS id,
            sp.id AS trang_bi_id,
            tb.ma_qr AS ma_ca_the,
            tb.so_serial AS serial,
            tb.cap_chat_luong,
            tb.trang_thai,
            sp.ten_san_pham,
            dm.ten_danh_muc AS loai_trang_bi,
            k.ten_kho AS kho,
            dv.ten_don_vi AS don_vi_quan_ly,
            k.id as kho_id_hien_tai,
            dv.id as don_vi_quan_ly_id,
            tb.created_at
        FROM trang_bi_thuc_te tb
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
        LEFT JOIN kho k ON tb.kho_id_hien_tai = k.id
        LEFT JOIN don_vi dv ON tb.don_vi_quan_ly_id = dv.id
        WHERE 1=1
    `;

  const params = [];

  // Lọc theo từ khóa (Tìm mã QR, serial, hoặc tên sản phẩm)
  if (tuKhoaTimKiem) {
    sql += ` AND (tb.ma_qr LIKE ? OR tb.so_serial LIKE ? OR sp.ten_san_pham LIKE ?) `;
    const keyword = `%${tuKhoaTimKiem}%`;
    params.push(keyword, keyword, keyword);
  }

  // Lọc theo trạng thái (TRONG_KHO, DANG_MUON, DANG_BAO_DUONG)
  if (trangThai) {
    sql += ` AND tb.trang_thai = ? `;
    params.push(trangThai);
  }

  // Lọc theo kho (Dropdown "Tất cả kho")
  if (khoId) {
    sql += ` AND tb.kho_id_hien_tai = ? `;
    params.push(khoId);
  }

  sql += ` ORDER BY tb.created_at DESC `;

  return db.prepare(sql).all(...params);
};

const taoTrangBiThucTe = (data, reqInfo = {}) => {
  // Tự động sinh mã QR nếu Frontend không truyền lên
  const maQR =
    data.ma_qr || `QR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const stmt = db.prepare(`
        INSERT INTO trang_bi_thuc_te (
            thong_tin_sp_id, so_serial, ma_qr, cap_chat_luong, 
            kho_id_hien_tai, don_vi_quan_ly_id, trang_thai
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

  const info = stmt.run(
    data.thong_tin_sp_id,
    data.so_serial || null,
    maQR,
    data.cap_chat_luong || 1, // Mặc định là Cấp 1 (Mới)
    data.kho_id_hien_tai || null,
    data.don_vi_quan_ly_id || null,
    data.trang_thai || "TRONG_KHO", // Thiết bị mới tạo luôn ở trạng thái Trong Kho
  );
  ghiNhatKy(
    reqInfo.userId,
    "CREATE",
    "trang_bi_thuc_te",
    info.lastInsertRowid,
    reqInfo.ip,
  );
  ghiLichSuSanPham(
    info.lastInsertRowid,
    "TAO_MOI",
    null,
    reqInfo.userId,
    "Khởi tạo mã thiết bị trên hệ thống",
  );
  return info.lastInsertRowid;
};

// 8. Tạo MỚI NHIỀU cá thể trang bị cùng lúc (Dùng khi nhập lô hàng)
const taoNhieuTrangBiThucTe = (danhSachData, reqInfo = {}) => {
  let insertedIds = [];

  const stmt = db.prepare(`
        INSERT INTO trang_bi_thuc_te (
            thong_tin_sp_id, so_serial, ma_qr, cap_chat_luong, 
            kho_id_hien_tai, don_vi_quan_ly_id, trang_thai
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

  // Dùng Transaction để đảm bảo insert nhiều dòng siêu nhanh và an toàn
  const transaction = db.transaction((ds) => {
    for (const data of ds) {
      const maQR =
        data.ma_qr || `QR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const info = stmt.run(
        data.thong_tin_sp_id,
        data.so_serial || null,
        maQR,
        data.cap_chat_luong || 1,
        data.kho_id_hien_tai || null,
        data.don_vi_quan_ly_id || null,
        data.trang_thai || "TRONG_KHO",
      );
      ghiLichSuSanPham(
        info.lastInsertRowid,
        "TAO_MOI",
        null,
        reqInfo.userId,
        "Khởi tạo thiết bị theo lô",
      );

      // 2. Ghi nhật ký hệ thống
      ghiNhatKy(
        reqInfo.userId,
        "CREATE",
        "trang_bi_thuc_te",
        info.lastInsertRowid,
        reqInfo.ip,
      );
      insertedIds.push(info.lastInsertRowid);
    }
  });

  transaction(danhSachData);
  return insertedIds;
};

const capNhatTrangBiThucTe = (id, data, reqInfo = {}) => {
  const stmt = db.prepare(`
        UPDATE trang_bi_thuc_te 
        SET so_serial = ?, cap_chat_luong = ?, kho_id_hien_tai = ?, 
            don_vi_quan_ly_id = ?, trang_thai = ?
        WHERE id = ?
    `);

  const info = stmt.run(
    data.so_serial || null,
    data.cap_chat_luong,
    data.kho_id_hien_tai || null,
    data.don_vi_quan_ly_id || null,
    data.trang_thai,
    id,
  );
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "UPDATE", "trang_bi_thuc_te", id, reqInfo.ip);
  return info.changes;
};

// 10. Xóa 1 cá thể (Từng cái)
const xoaTrangBiThucTe = (id, reqInfo = {}) => {
  const stmt = db.prepare("DELETE FROM trang_bi_thuc_te WHERE id = ?");
  const info = stmt.run(id);
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "DELETE", "trang_bi_thuc_te", id, reqInfo.ip);
  return info.changes;
};

const layTrangBiThucTeTheoKho = (khoId) => {
  const sql = `
        SELECT 
            tb.id AS id,
            sp.id AS trang_bi_id,
            tb.ma_qr AS ma_ca_the,
            tb.so_serial AS serial,
            tb.cap_chat_luong,
            tb.trang_thai,
            sp.ten_san_pham,
            dm.ten_danh_muc AS loai_trang_bi,
            k.ten_kho AS kho,
            dv.ten_don_vi AS don_vi_quan_ly,
            k.id as kho_id_hien_tai,
            dv.id as don_vi_quan_ly_id,
            tb.created_at
        FROM trang_bi_thuc_te tb
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
        LEFT JOIN kho k ON tb.kho_id_hien_tai = k.id
        LEFT JOIN don_vi dv ON tb.don_vi_quan_ly_id = dv.id
        WHERE tb.kho_id_hien_tai = ?
        ORDER BY tb.created_at DESC
    `;

  return db.prepare(sql).all(khoId);
};

const layTrangBiTheoMaQR = (maQR) => {
  const sql = `
        SELECT 
            tb.id AS trang_bi_id,
            tb.ma_qr AS ma_ca_the,
            tb.so_serial AS serial,
            tb.cap_chat_luong,
            tb.trang_thai,
            sp.ten_san_pham,
            sp.id AS thong_tin_sp_id,
            dm.ten_danh_muc AS loai_trang_bi,
            k.ten_kho AS kho,
            k.id AS kho_id_hien_tai,
            dv.ten_don_vi AS don_vi_quan_ly,
            dv.id AS don_vi_quan_ly_id,
            tb.created_at
        FROM trang_bi_thuc_te tb
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
        LEFT JOIN kho k ON tb.kho_id_hien_tai = k.id
        LEFT JOIN don_vi dv ON tb.don_vi_quan_ly_id = dv.id
        WHERE tb.ma_qr = ?
    `;

  return db.prepare(sql).get(maQR); // Dùng .get() vì mã QR là duy nhất (UNIQUE)
};

const ghiLichSuSanPham = (
  trangBiId,
  loaiSuKien,
  referenceId,
  nguoiThucHienId,
  ghiChu = "",
) => {
  try {
    const stmt = db.prepare(`
            INSERT INTO lich_su_san_pham (trang_bi_thuc_te_id, loai_su_kien, reference_id, nguoi_thuc_hien_id, ghi_chu)
            VALUES (?, ?, ?, ?, ?)
        `);
    stmt.run(
      trangBiId,
      loaiSuKien,
      referenceId || null,
      nguoiThucHienId || null,
      ghiChu,
    );
  } catch (error) {
    console.error("Lỗi ghi lịch sử sản phẩm:", error.message);
  }
};

// Hàm LẤY lịch sử của 1 thiết bị cụ thể (Dành cho màn hình hiển thị Timeline)
const layLichSuTheoTrangBi = (trangBiId) => {
  const sql = `
        SELECT ls.*, u.full_name AS nguoi_thuc_hien
        FROM lich_su_san_pham ls
        LEFT JOIN users u ON ls.nguoi_thuc_hien_id = u.id
        WHERE ls.trang_bi_thuc_te_id = ?
        ORDER BY ls.ngay_thuc_hien DESC, ls.id DESC
    `;
  return db.prepare(sql).all(trangBiId);
};

const maHoaChiTietVaLichSu = (maQR, secretKey) => {
  // A. Lấy thông tin thiết bị
  const thietBi = db
    .prepare(
      `
        SELECT 
            tb.id AS trang_bi_id, tb.ma_qr AS ma_ca_the, tb.so_serial AS serial, tb.cap_chat_luong, tb.trang_thai,
            sp.ten_san_pham, dm.ten_danh_muc, k.ten_kho
        FROM trang_bi_thuc_te tb
        JOIN thong_tin_san_pham sp ON tb.thong_tin_sp_id = sp.id
        LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
        LEFT JOIN kho k ON tb.kho_id_hien_tai = k.id
        WHERE tb.ma_qr = ?
    `,
    )
    .get(maQR);

  if (!thietBi) throw new Error("Không tìm thấy thiết bị để mã hóa!");

  // B. Lấy lịch sử
  const lichSu = layLichSuTheoTrangBi(thietBi.trang_bi_id);

  // C. Gom dữ liệu
  const fullData = {
    thong_tin: thietBi,
    lich_su: lichSu,
    thoi_gian_xuat: new Date().toISOString(),
  };

  // D. Mã hóa (Sử dụng hàm encryptData có nén zlib để chuỗi ngắn nhất)
  return encryptData(fullData, secretKey);
};

// 2. Giải mã chuỗi
const giaiMaChiTietVaLichSu = (chuoiMaHoa, secretKey) => {
  return decryptData(chuoiMaHoa, secretKey);
};

module.exports = {
  layThongKeTongQuan,
  layTatCaSanPham,
  laySanPhamTheoId,
  taoSanPham,
  capNhatSanPham,
  xoaSanPham,
  layTonKhoChiTiet,
  layPhanBoKhoTheoSanPham,
  layDanhSachTrangBiTungCai,
  taoTrangBiThucTe,
  taoNhieuTrangBiThucTe,
  capNhatTrangBiThucTe,
  xoaTrangBiThucTe,
  layTrangBiThucTeTheoKho,
  layTrangBiTheoMaQR,
  ghiLichSuSanPham,
  layLichSuTheoTrangBi,
  maHoaChiTietVaLichSu,
  giaiMaChiTietVaLichSu,
};
