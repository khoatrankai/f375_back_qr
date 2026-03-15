const db = require("../config/database");

// Hàm GHI nhật ký (Sẽ được gọi chèn vào bên trong các service khác)
const ghiNhatKy = (userId, action, tableName, recordId, ipAddress) => {
  try {
    const stmt = db.prepare(`
            INSERT INTO nhat_ky_he_thong (user_id, action, table_name, record_id, ip_address)
            VALUES (?, ?, ?, ?, ?)
        `);
    // Dùng try-catch bọc lại để nếu lỗi ghi log cũng KHÔNG làm sập chức năng chính
    stmt.run(
      userId || null,
      action,
      tableName || null,
      recordId || null,
      ipAddress || null,
    );
  } catch (error) {
    console.error("LỖI GHI NHẬT KÝ HỆ THỐNG:", error.message);
  }
};

// Hàm LẤY danh sách nhật ký (Dành cho màn hình Admin)
const layDanhSachNhatKy = (limit = 50, offset = 0) => {
  const sql = `
        SELECT nk.*, u.username, u.full_name
        FROM nhat_ky_he_thong nk
        LEFT JOIN users u ON nk.user_id = u.id
        ORDER BY nk.created_at DESC
        LIMIT ? OFFSET ?
    `;
  return db.prepare(sql).all(limit, offset);
};

module.exports = {
  ghiNhatKy,
  layDanhSachNhatKy,
};
