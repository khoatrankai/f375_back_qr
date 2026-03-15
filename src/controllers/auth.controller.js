const authService = require("../services/auth.service");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = (req, res) => {
  try {
    const { username, password, full_name } = req.body;
    if (authService.kiemTraUser(username)) {
      return res
        .status(400)
        .json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
    }
    const newUserId = authService.taoUserMoi(req.body);
    res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
      data: { id: newUserId },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng nhập tài khoản và mật khẩu!",
        });
    }

    const data = await authService.login(username, password);
    res
      .status(200)
      .json({ success: true, message: "Đăng nhập thành công!", data });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

const emergencySetup = async (req, res) => {
  try {
    const { emergency_key } = req.body;
    if (!emergency_key) {
      return res
        .status(400)
        .json({ success: false, message: "Yêu cầu khóa hệ thống!" });
    }

    const data = await authService.createEmergencyAccount(emergency_key);
    res.status(200).json({ success: true, data });
  } catch (error) {
    // Trả về 403 (Forbidden) nếu nhập sai mã khẩn cấp
    res.status(403).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, emergencySetup };
