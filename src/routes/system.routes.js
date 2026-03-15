const express = require("express");
const router = express.Router();
const systemController = require("../controllers/system.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

// Bắt buộc phải đăng nhập (có token) mới được gọi API này
router.use(verifyToken);

router.get("/don-vi", systemController.getDonVi);
router.post("/don-vi", systemController.createDonVi);

module.exports = router;
