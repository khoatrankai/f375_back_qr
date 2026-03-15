const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");

// Lấy toàn bộ dữ liệu cho màn hình chính
router.get("/tong-quan", dashboardController.getOverviewDashboard);

module.exports = router;
