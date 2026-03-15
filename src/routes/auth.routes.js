const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/login", authController.login);

// Thêm dòng này: API Cứu hộ
router.post("/emergency-setup", authController.emergencySetup);

module.exports = router;
