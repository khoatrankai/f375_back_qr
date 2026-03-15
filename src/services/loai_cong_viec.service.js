const db = require("../config/database");
const { ghiNhatKy } = require("./nhat_ky.service");

// Lấy danh sách toàn bộ loại công việc
const layTatCaLoaiCV = () => {
  return db
    .prepare("SELECT * FROM loai_cong_viec ORDER BY created_at DESC")
    .all();
};

// Lấy thông tin 1 loại công việc theo ID
const layLoaiCVTheoId = (id) => {
  return db.prepare("SELECT * FROM loai_cong_viec WHERE id = ?").get(id);
};

// Thêm mới loại công việc
const taoLoaiCV = (data, reqInfo = {}) => {
  const stmt = db.prepare(`
        INSERT INTO loai_cong_viec (ma_loai_cv, ten_loai_cv, mo_ta) 
        VALUES (?, ?, ?)
    `);
  const info = stmt.run(data.ma_loai_cv, data.ten_loai_cv, data.mo_ta || null);
  ghiNhatKy(
    reqInfo.userId,
    "CREATE",
    "loai_cong_viec",
    info.lastInsertRowid,
    reqInfo.ip,
  );
  return info.lastInsertRowid;
};

// Cập nhật thông tin loại công việc
const capNhatLoaiCV = (id, data, reqInfo = {}) => {
  const stmt = db.prepare(`
        UPDATE loai_cong_viec 
        SET ma_loai_cv = ?, ten_loai_cv = ?, mo_ta = ? 
        WHERE id = ?
    `);
  const info = stmt.run(
    data.ma_loai_cv,
    data.ten_loai_cv,
    data.mo_ta || null,
    id,
  );
  if (info.changes > 0) {
    ghiNhatKy(reqInfo.userId, "UPDATE", "loai_cong_viec", id, reqInfo.ip);
  }
  return info.changes;
};

// Xóa loại công việc
const xoaLoaiCV = (id, reqInfo = {}) => {
  const stmt = db.prepare("DELETE FROM loai_cong_viec WHERE id = ?");
  const info = stmt.run(id);
  if (info.changes > 0) {
    ghiNhatKy(reqInfo.userId, "DELETE", "loai_cong_viec", id, reqInfo.ip);
  }
  return info.changes;
};

module.exports = {
  layTatCaLoaiCV,
  layLoaiCVTheoId,
  taoLoaiCV,
  capNhatLoaiCV,
  xoaLoaiCV,
};
