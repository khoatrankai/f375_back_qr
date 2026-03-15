const db = require("../config/database");
const { ghiNhatKy } = require("./nhat_ky.service");

// Lấy danh sách toàn bộ đơn vị
const layTatCaDonVi = () => {
  const sql = `
        SELECT 
            dv.*,
            ct.ma_don_vi AS cap_tren_ma,
            ct.ten_don_vi AS cap_tren_ten,
            (SELECT COUNT(*) FROM trang_bi_thuc_te tb WHERE tb.don_vi_quan_ly_id = dv.id) AS so_luong_trang_bi
        FROM don_vi dv
        LEFT JOIN don_vi ct ON dv.cap_tren_id = ct.id
        ORDER BY dv.created_at DESC
    `;

  const rows = db.prepare(sql).all();

  return rows.map((row) => {
    // Tách các trường thông tin cấp trên và số lượng ra khỏi object chính
    const { cap_tren_ma, cap_tren_ten, so_luong_trang_bi, ...donViData } = row;

    // Gắn số lượng vào data trả về
    donViData.so_luong_trang_bi = so_luong_trang_bi || 0;

    if (donViData.cap_tren_id) {
      donViData.cap_tren = {
        id: donViData.cap_tren_id,
        ma_don_vi: cap_tren_ma,
        ten_don_vi: cap_tren_ten,
      };
    } else {
      donViData.cap_tren = null;
    }

    return donViData;
  });
};

// Lấy thông tin 1 đơn vị theo ID (Kèm thông tin cấp trên VÀ Số lượng trang bị)
const layDonViTheoId = (id) => {
  const sql = `
        SELECT 
            dv.*,
            ct.ma_don_vi AS cap_tren_ma,
            ct.ten_don_vi AS cap_tren_ten,
            (SELECT COUNT(*) FROM trang_bi_thuc_te tb WHERE tb.don_vi_quan_ly_id = dv.id) AS so_luong_trang_bi
        FROM don_vi dv
        LEFT JOIN don_vi ct ON dv.cap_tren_id = ct.id
        WHERE dv.id = ?
    `;

  const row = db.prepare(sql).get(id);

  if (!row) return null;

  const { cap_tren_ma, cap_tren_ten, so_luong_trang_bi, ...donViData } = row;

  donViData.so_luong_trang_bi = so_luong_trang_bi || 0;

  if (donViData.cap_tren_id) {
    donViData.cap_tren = {
      id: donViData.cap_tren_id,
      ma_don_vi: cap_tren_ma,
      ten_don_vi: cap_tren_ten,
    };
  } else {
    donViData.cap_tren = null;
  }

  return donViData;
};

// Thêm mới đơn vị
const taoDonVi = (data, reqInfo = {}) => {
  let finalMaDonVi = data.ma_don_vi; // Ví dụ: "C1"

  // Nếu có chọn đơn vị cha (cap_tren_id có giá trị)
  if (data.cap_tren_id) {
    // 1. Lấy thông tin đơn vị cha từ DB
    const capTren = db
      .prepare("SELECT ma_don_vi FROM don_vi WHERE id = ?")
      .get(data.cap_tren_id);

    if (!capTren) {
      throw new Error("Đơn vị cấp trên không tồn tại trong hệ thống!");
    }

    // 2. Nối chuỗi mã con và mã cha. VD: "C1" + "/" + "D10/PTM" => "C1/D10/PTM"
    finalMaDonVi = `${data.ma_don_vi}/${capTren.ma_don_vi}`;
  }

  // 3. Tiến hành Insert với mã đã được nối
  const stmt = db.prepare(`
        INSERT INTO don_vi (ma_don_vi, ten_don_vi, cap_tren_id) 
        VALUES (?, ?, ?)
    `);

  const info = stmt.run(
    finalMaDonVi,
    data.ten_don_vi,
    data.cap_tren_id || null,
  );
  ghiNhatKy(
    reqInfo.userId,
    "CREATE",
    "don_vi",
    info.lastInsertRowid,
    reqInfo.ip,
  );
  return info.lastInsertRowid;
};

// Cập nhật thông tin đơn vị (Cũng cần nối lại mã cha phòng trường hợp đổi đơn vị trực thuộc)
const capNhatDonVi = (id, data, reqInfo = {}) => {
  let finalMaDonVi = data.ma_don_vi;

  if (data.cap_tren_id) {
    const capTren = db
      .prepare("SELECT ma_don_vi FROM don_vi WHERE id = ?")
      .get(data.cap_tren_id);

    if (!capTren) {
      throw new Error("Đơn vị cấp trên không tồn tại trong hệ thống!");
    }

    // Kiểm tra xem frontend có gửi kèm cả đuôi mã cha không.
    // Nếu chưa có đuôi mã cha thì ta mới nối vào để tránh bị trùng lặp thành C1/D10/PTM/D10/PTM
    const suffix = `/${capTren.ma_don_vi}`;
    if (!finalMaDonVi.endsWith(suffix)) {
      // Cắt phần đuôi cũ (nếu có) trước khi ghép đuôi cha mới (dành cho trường hợp cập nhật chuyển đơn vị cha)
      const maGoc = finalMaDonVi.split("/")[0];
      finalMaDonVi = `${maGoc}${suffix}`;
    }
  }

  const stmt = db.prepare(`
        UPDATE don_vi 
        SET ma_don_vi = ?, ten_don_vi = ?, cap_tren_id = ? 
        WHERE id = ?
    `);

  const info = stmt.run(
    finalMaDonVi,
    data.ten_don_vi,
    data.cap_tren_id || null,
    id,
  );
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "UPDATE", "don_vi", id, reqInfo.ip);
  return info.changes;
};

// Xóa đơn vị
const xoaDonVi = (id, reqInfo = {}) => {
  const stmt = db.prepare("DELETE FROM don_vi WHERE id = ?");
  const info = stmt.run(id);
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "DELETE", "don_vi", id, reqInfo.ip);
  return info.changes;
};

const layCayDonVi = () => {
  // 1. Lấy toàn bộ đơn vị (có thể kèm luôn số lượng trang bị để UI hiển thị số lân cận)
  const sql = `
        SELECT 
            dv.*
        FROM don_vi dv
        ORDER BY dv.created_at ASC
    `;
  const dsDonViFlat = db.prepare(sql).all();

  // 2. Thuật toán biến mảng phẳng (Flat Array) thành Cây (Tree)
  const donViMap = {};
  const donViTree = [];

  // Bước 2.1: Khởi tạo Map và thêm mảng 'children' trống cho từng đơn vị
  dsDonViFlat.forEach((dv) => {
    donViMap[dv.id] = { ...dv, children: [] };
  });

  // Bước 2.2: Duyệt lại mảng và nhét các node con vào đúng node cha của nó
  dsDonViFlat.forEach((dv) => {
    // Nếu có đơn vị cấp trên
    if (dv.cap_tren_id) {
      // Kiểm tra xem đơn vị cấp trên có tồn tại trong Map không
      if (donViMap[dv.cap_tren_id]) {
        donViMap[dv.cap_tren_id].children.push(donViMap[dv.id]);
      } else {
        // Đề phòng trường hợp database lỗi (có ID cha nhưng cha bị xóa mất) -> Cứ đẩy ra ngoài cùng
        donViTree.push(donViMap[dv.id]);
      }
    } else {
      // Nếu không có cấp trên (cap_tren_id = null), nó là gốc rễ (Root node)
      donViTree.push(donViMap[dv.id]);
    }
  });

  return donViTree;
};

module.exports = {
  layTatCaDonVi,
  layDonViTheoId,
  taoDonVi,
  capNhatDonVi,
  xoaDonVi,
  layCayDonVi,
};
