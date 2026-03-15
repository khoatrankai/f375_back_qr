const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

// Nên sử dụng Middleware kiểm tra Token và Quyền (Role) ở đây
// VD: Chỉ ADMIN mới được thêm/sửa/xóa User

router.put("/profile", userController.updateProfile); // Cập nhật profile
router.put("/change-password", userController.changePassword); // Đổi pass

router.get("/", userController.getAllUsers); // GET /api/users
router.get("/:id", userController.getUserById); // GET /api/users/:id
router.post("/", userController.createUser); // POST /api/users
router.put("/:id", userController.updateUser); // PUT /api/users/:id
router.delete("/:id", userController.deleteUser); // DELETE /api/users/:id

module.exports = router;
