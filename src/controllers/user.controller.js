const userService = require("../services/user.service");
const { getReqInfo } = require("../utils/requestHelper");

const getAllUsers = (req, res) => {
  try {
    const data = userService.layTatCaUser();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserById = (req, res) => {
  try {
    const id = req.params.id;
    const data = userService.layUserTheoId(id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy người dùng!" });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createUser = (req, res) => {
  try {
    if (!req.body.password) {
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu là bắt buộc khi tạo mới!" });
    }
    const newId = userService.taoUser(req.body, getReqInfo(req));
    res.status(201).json({
      success: true,
      message: "Tạo người dùng thành công!",
      data: { id: newId },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập (username) đã tồn tại!",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = (req, res) => {
  try {
    const id = req.params.id;
    const changes = userService.capNhatUser(id, req.body, getReqInfo(req));

    if (changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng để cập nhật!",
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Cập nhật người dùng thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUser = (req, res) => {
  try {
    const id = req.params.id;
    const changes = userService.xoaUser(id, getReqInfo(req));

    if (changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy người dùng để xóa!" });
    }
    res
      .status(200)
      .json({ success: true, message: "Xóa người dùng thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = (req, res) => {
  try {
    const userId = req.user.id;

    // Ví dụ req.body gửi lên:
    // { "full_name": "Nguyễn A", "profile": { "email": "a@gmail.com", "phone": "0988" } }
    const updatedUser = userService.updateProfile(userId, req.body);

    // Parse lại profile_data cho đẹp trước khi trả về Frontend
    if (updatedUser.profile_data) {
      updatedUser.profile_data = JSON.parse(updatedUser.profile_data);
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công!",
      data: updatedUser,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// API Đổi mật khẩu
const changePassword = async (req, res) => {
  try {
    // Lấy ID từ token (middleware verifyToken đã gắn vào req.user)
    const userId = req.user.id;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!",
        });
    }

    if (new_password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự!",
        });
    }

    await userService.changePassword(userId, old_password, new_password);

    res
      .status(200)
      .json({ success: true, message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  updateProfile,
};
