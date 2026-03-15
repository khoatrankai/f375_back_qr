const db = require("../config/database");
const { ghiNhatKy } = require("./nhat_ky.service");

// Lấy danh sách toàn bộ danh mục (Kèm thông tin danh mục cha VÀ Số lượng sản phẩm)
const layTatCaDanhMuc = () => {
  const sql = `
        SELECT 
            dm.*,
            cha.ma_danh_muc AS cha_ma,
            cha.ten_danh_muc AS cha_ten,
            (SELECT COUNT(*) FROM thong_tin_san_pham sp WHERE sp.danh_muc_id = dm.id) AS so_luong_san_pham
        FROM danh_muc dm
        LEFT JOIN danh_muc cha ON dm.parent_id = cha.id
        ORDER BY dm.created_at DESC
    `;

  const rows = db.prepare(sql).all();

  return rows.map((row) => {
    // Tách số lượng sản phẩm và thông tin cha ra khỏi object chính
    const { cha_ma, cha_ten, so_luong_san_pham, ...danhMucData } = row;

    // Gắn số lượng vào data trả về
    danhMucData.so_luong_san_pham = so_luong_san_pham || 0;

    if (danhMucData.parent_id) {
      danhMucData.danh_muc_cha = {
        id: danhMucData.parent_id,
        ma_danh_muc: cha_ma,
        ten_danh_muc: cha_ten,
      };
    } else {
      danhMucData.danh_muc_cha = null;
    }

    return danhMucData;
  });
};

// Lấy thông tin 1 danh mục theo ID (Kèm thông tin danh mục cha VÀ Số lượng sản phẩm)
const layDanhMucTheoId = (id) => {
  const sql = `
        SELECT 
            dm.*,
            cha.ma_danh_muc AS cha_ma,
            cha.ten_danh_muc AS cha_ten,
            (SELECT COUNT(*) FROM thong_tin_san_pham sp WHERE sp.danh_muc_id = dm.id) AS so_luong_san_pham
        FROM danh_muc dm
        LEFT JOIN danh_muc cha ON dm.parent_id = cha.id
        WHERE dm.id = ?
    `;

  const row = db.prepare(sql).get(id);
  if (!row) return null;

  const { cha_ma, cha_ten, so_luong_san_pham, ...danhMucData } = row;

  danhMucData.so_luong_san_pham = so_luong_san_pham || 0;

  if (danhMucData.parent_id) {
    danhMucData.danh_muc_cha = {
      id: danhMucData.parent_id,
      ma_danh_muc: cha_ma,
      ten_danh_muc: cha_ten,
    };
  } else {
    danhMucData.danh_muc_cha = null;
  }

  return danhMucData;
};

// Thêm mới danh mục
const taoDanhMuc = (data, reqInfo = {}) => {
  const stmt = db.prepare(`
        INSERT INTO danh_muc (ma_danh_muc, ten_danh_muc, parent_id) 
        VALUES (?, ?, ?)
    `);
  const info = stmt.run(
    data.ma_danh_muc,
    data.ten_danh_muc,
    data.parent_id || null,
  );
  ghiNhatKy(
    reqInfo.userId,
    "CREATE",
    "danh_muc",
    info.lastInsertRowid,
    reqInfo.ip,
  );
  return info.lastInsertRowid;
};

// Cập nhật thông tin danh mục
const capNhatDanhMuc = (id, data, reqInfo = {}) => {
  const stmt = db.prepare(`
        UPDATE danh_muc 
        SET ma_danh_muc = ?, ten_danh_muc = ?, parent_id = ? 
        WHERE id = ?
    `);
  const info = stmt.run(
    data.ma_danh_muc,
    data.ten_danh_muc,
    data.parent_id || null,
    id,
  );
  if (info.changes > 0) {
    ghiNhatKy(reqInfo.userId, "UPDATE", "danh_muc", id, reqInfo.ip);
  }
  return info.changes;
};

// Xóa danh mục
const xoaDanhMuc = (id, reqInfo = {}) => {
  const stmt = db.prepare("DELETE FROM danh_muc WHERE id = ?");
  const info = stmt.run(id);
  if (info.changes > 0) {
    ghiNhatKy(reqInfo.userId, "DELETE", "danh_muc", id, reqInfo.ip);
  }
  return info.changes;
};

const layCayDanhMuc = () => {
  // 1. Lấy toàn bộ danh mục dạng phẳng (Kèm theo số lượng sản phẩm của danh mục đó)
  const sql = `
        SELECT 
            dm.*
        FROM danh_muc dm
        ORDER BY dm.created_at ASC
    `;
  const dsDanhMucFlat = db.prepare(sql).all();

  // 2. Dùng thuật toán Hash Map để đan cây (O(N))
  const danhMucMap = {};
  const danhMucTree = [];

  // Bước 2.1: Khởi tạo Map
  dsDanhMucFlat.forEach((dm) => {
    danhMucMap[dm.id] = { ...dm, children: [] };
  });

  // Bước 2.2: Gắn node con vào node cha
  dsDanhMucFlat.forEach((dm) => {
    if (dm.parent_id) {
      // Nếu danh mục có cha, đẩy nó vào mảng children của cha
      if (danhMucMap[dm.parent_id]) {
        danhMucMap[dm.parent_id].children.push(danhMucMap[dm.id]);
      } else {
        // Đề phòng data lỗi (mất cha), cho ra ngoài root
        danhMucTree.push(danhMucMap[dm.id]);
      }
    } else {
      // Danh mục gốc (parent_id = null)
      danhMucTree.push(danhMucMap[dm.id]);
    }
  });

  return danhMucTree;
};

module.exports = {
  layTatCaDanhMuc,
  layDanhMucTheoId,
  taoDanhMuc,
  capNhatDanhMuc,
  xoaDanhMuc,
  layCayDanhMuc,
};
