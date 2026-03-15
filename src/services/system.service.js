const db = require("../config/database");

// Quản lý Đơn Vị
const layTatCaDonVi = () =>
  db.prepare("SELECT * FROM don_vi ORDER BY created_at DESC").all();
const taoDonVi = (data) =>
  db
    .prepare(
      "INSERT INTO don_vi (ma_don_vi, ten_don_vi, cap_tren_id) VALUES (?, ?, ?)",
    )
    .run(data.ma_don_vi, data.ten_don_vi, data.cap_tren_id).lastInsertRowid;

module.exports = { layTatCaDonVi, taoDonVi };
