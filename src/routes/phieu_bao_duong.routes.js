const express = require("express");
const router = express.Router();
const phieuBDController = require("../controllers/phieu_bao_duong.controller");

router.get("/", phieuBDController.getDanhSachPhieu);
router.get("/:id", phieuBDController.getChiTietPhieu);
router.post("/", phieuBDController.createPhieu);
router.put("/:id/hoan-thanh", phieuBDController.completeBaoDuong); // Route hoàn thành

module.exports = router;
