const db = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middlewares/auth.middleware");
const kiemTraUser = (username) => {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
};

const taoUserMoi = (userData) => {
  const hash = bcrypt.hashSync(userData.password, 10);
  const stmt = db.prepare(
    "INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
  );
  const info = stmt.run(
    userData.username,
    hash,
    userData.full_name,
    userData.role || "USER",
  );
  return info.lastInsertRowid;
};

// 1. LOGIN
const login = async (username, password) => {
  // Tìm user theo username
  const user = db
    .prepare(`SELECT * FROM users WHERE username = ?`)
    .get(username);
  console.log(user);
  if (!user) throw new Error("Tài khoản không tồn tại!");

  // So sánh mật khẩu (Mật khẩu nhập vào vs Mật khẩu đã hash trong DB)
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new Error("Mật khẩu không chính xác!");

  // Tạo JWT Token (Chứa id, username, role). Hết hạn sau 24h
  const payload = { id: user.id, username: user.username, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

  // Trả về thông tin (che mật khẩu đi)
  const { password_hash: _, reset_otp, reset_otp_expiry, ...userInfo } = user;
  return { token, user: userInfo };
};
const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};
const createEmergencyAccount = async (emergencyKey) => {
  // Khóa bí mật (Thực tế nên để trong file .env). Chỉ ai biết pass này mới được gọi API.
  const SYSTEM_SECRET = process.env.EMERGENCY_SECRET || "adminrs";

  if (emergencyKey !== SYSTEM_SECRET) {
    throw new Error("Khóa hệ thống không hợp lệ! Truy cập bị từ chối.");
  }

  const defaultUsername = "superadmin";
  const defaultPassword = "superadmin"; // Mật khẩu mặc định

  // Mã hóa mật khẩu
  const hashedPassword = await hashPassword(defaultPassword);
  // Kiểm tra xem tài khoản này đã tồn tại chưa
  const existingUser = db
    .prepare(`SELECT id FROM users WHERE username = ?`)
    .get(defaultUsername);

  if (existingUser) {
    // Nếu lỡ quên pass của tài khoản cứu hộ luôn -> Reset lại về mặc định
    db.prepare(
      `UPDATE users SET password_hash = ?, role = 'ADMIN' WHERE id = ?`,
    ).run(hashedPassword, existingUser.id);
    return {
      message: "Đã khôi phục tài khoản cứu hộ về mật khẩu mặc định!",
      username: defaultUsername,
      password: defaultPassword,
    };
  } else {
    // Nếu chưa có -> Tạo mới hoàn toàn
    db.prepare(
      `
            INSERT INTO users (username, password_hash, full_name, role) 
            VALUES (?, ?, 'Tài khoản Cứu hộ Hệ thống', 'ADMIN')
        `,
    ).run(defaultUsername, hashedPassword);

    return {
      message: "Đã tạo thành công tài khoản cứu hộ!",
      username: defaultUsername,
      password: defaultPassword,
    };
  }
};

module.exports = { kiemTraUser, taoUserMoi, login, createEmergencyAccount };
