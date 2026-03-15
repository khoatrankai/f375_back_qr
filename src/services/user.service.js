const db = require("../config/database");
const bcrypt = require("bcryptjs");
const { ghiNhatKy } = require("./nhat_ky.service");

// Lấy danh sách toàn bộ người dùng (kèm thông tin đơn vị, ẩn mật khẩu)
const layTatCaUser = () => {
  const sql = `
        SELECT 
            u.id, u.username, u.full_name, u.role, u.is_active, 
            u.profile_data, u.created_at, u.updated_at,
            d.id AS dv_id, d.ma_don_vi, d.ten_don_vi
        FROM users u
        LEFT JOIN don_vi d ON u.don_vi_id = d.id
        ORDER BY u.created_at DESC
    `;

  const rows = db.prepare(sql).all();

  return rows.map((row) => {
    const { dv_id, ma_don_vi, ten_don_vi, ...userData } = row;

    // Parse JSON string thành Object cho frontend dễ dùng
    userData.profile_data = JSON.parse(userData.profile_data || "{}");

    if (dv_id) {
      userData.don_vi = { id: dv_id, ma_don_vi, ten_don_vi };
    } else {
      userData.don_vi = null;
    }

    return userData;
  });
};

const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

// Lấy thông tin 1 user theo ID
const layUserTheoId = (id) => {
  const sql = `
        SELECT 
            u.id, u.username, u.full_name, u.role, u.is_active, 
            u.profile_data, u.created_at, u.updated_at,
            d.id AS dv_id, d.ma_don_vi, d.ten_don_vi
        FROM users u
        LEFT JOIN don_vi d ON u.don_vi_id = d.id
        WHERE u.id = ?
    `;

  const row = db.prepare(sql).get(id);
  if (!row) return null;

  const { dv_id, ma_don_vi, ten_don_vi, ...userData } = row;
  userData.profile_data = JSON.parse(userData.profile_data || "{}");

  if (dv_id) {
    userData.don_vi = { id: dv_id, ma_don_vi, ten_don_vi };
  } else {
    userData.don_vi = null;
  }

  return userData;
};

// Tạo user mới (Tự động hash mật khẩu)
const taoUser = (data, reqInfo = {}) => {
  const hash = hashPassword(data.password);
  const profileJson = JSON.stringify(data.profile_data || {});

  const stmt = db.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, don_vi_id, is_active, profile_data) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

  const info = stmt.run(
    data.username,
    hash,
    data.full_name,
    data.role || "USER",
    data.don_vi_id || null,
    data.is_active !== undefined ? data.is_active : 1,
    profileJson,
  );
  ghiNhatKy(
    reqInfo.userId,
    "CREATE",
    "users",
    info.lastInsertRowid,
    reqInfo.ip,
  );
  return info.lastInsertRowid;
};

// Cập nhật thông tin user
const capNhatUser = (id, data, reqInfo = {}) => {
  let stmt;
  let info;
  const profileJson = JSON.stringify(data.profile_data || {});

  // Nếu người dùng có gửi mật khẩu mới thì cập nhật cả mật khẩu
  if (data.password) {
    const hash = bcrypt.hashSync(data.password, 10);
    stmt = db.prepare(`
            UPDATE users 
            SET full_name = ?, role = ?, don_vi_id = ?, is_active = ?, profile_data = ?, password_hash = ?
            WHERE id = ?
        `);
    info = stmt.run(
      data.full_name,
      data.role,
      data.don_vi_id || null,
      data.is_active,
      profileJson,
      hash,
      id,
    );
  } else {
    // Nếu không gửi mật khẩu thì giữ nguyên mật khẩu cũ
    stmt = db.prepare(`
            UPDATE users 
            SET full_name = ?, role = ?, don_vi_id = ?, is_active = ?, profile_data = ?
            WHERE id = ?
        `);
    info = stmt.run(
      data.full_name,
      data.role,
      data.don_vi_id || null,
      data.is_active,
      profileJson,
      id,
    );
  }
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "UPDATE", "users", id, reqInfo.ip);
  return info.changes;
};

// Xóa user
const xoaUser = (id, reqInfo = {}) => {
  const stmt = db.prepare("DELETE FROM users WHERE id = ?");
  const info = stmt.run(id);
  if (info.changes > 0)
    ghiNhatKy(reqInfo.userId, "DELETE", "users", id, reqInfo.ip);
  return info.changes;
};

// ================= ĐỔI MẬT KHẨU =================
const changePassword = async (userId, oldPassword, newPassword) => {
  // 1. Lấy password_hash hiện tại
  const user = db
    .prepare(`SELECT password_hash FROM users WHERE id = ?`)
    .get(userId);
  if (!user) throw new Error("Người dùng không tồn tại!");
  if (!user.password_hash) throw new Error("Tài khoản chưa có mật khẩu!");

  // 2. So sánh mật khẩu cũ
  const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isMatch) throw new Error("Mật khẩu cũ không chính xác!");

  // 3. Mã hóa mật khẩu mới
  const salt = await bcrypt.genSalt(10);
  const hashedNewPassword = await bcrypt.hash(newPassword, salt);

  // 4. Lưu đè password_hash mới
  db.prepare(
    `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  ).run(hashedNewPassword, userId);

  return true;
};

// ================= CẬP NHẬT PROFILE =================
const updateProfile = (userId, updateData) => {
  const user = db
    .prepare(`SELECT id, profile_data FROM users WHERE id = ?`)
    .get(userId);
  if (!user) throw new Error("Người dùng không tồn tại!");

  // Lấy chuỗi JSON cũ ra (nếu null thì cho thành {})
  let currentProfile = {};
  try {
    currentProfile = JSON.parse(user.profile_data || "{}");
  } catch (e) {}

  // Gộp data mới vào profile_data cũ (VD user gửi lên email, phone, dia_chi...)
  const newProfileData = {
    ...currentProfile,
    ...(updateData.profile || {}), // Lấy mảng profile từ Frontend gửi lên
  };

  // Tiến hành cập nhật: Cập nhật full_name, don_vi_id và ghi đè lại chuỗi JSON profile_data
  db.prepare(
    `
        UPDATE users 
        SET full_name = COALESCE(?, full_name),
            don_vi_id = COALESCE(?, don_vi_id),
            profile_data = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `,
  ).run(
    updateData.full_name || null,
    updateData.don_vi_id || null,
    JSON.stringify(newProfileData), // Chuyển Object về lại String JSON
    userId,
  );

  // Lấy lại data sau khi update để trả về
  return db
    .prepare(
      `SELECT id, username, full_name, role, don_vi_id, profile_data FROM users WHERE id = ?`,
    )
    .get(userId);
};

module.exports = {
  layTatCaUser,
  layUserTheoId,
  taoUser,
  capNhatUser,
  xoaUser,
  changePassword,
  updateProfile,
};
