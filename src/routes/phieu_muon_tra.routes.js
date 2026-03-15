const express = require("express");
const router = express.Router();
const phieuMuonTraController = require("../controllers/phieu_muon_tra.controller");

router.get("/thong-ke", phieuMuonTraController.getThongKeMuonTra); // Lấy data cho 3 ô Card
router.get("/", phieuMuonTraController.getDanhSachPhieu); // Lấy list phiếu
router.get("/:id", phieuMuonTraController.getChiTietPhieu); // Xem chi tiết phiếu
router.post("/", phieuMuonTraController.createPhieu); // Tạo phiếu mượn
router.put("/:id/tra", phieuMuonTraController.returnThietBi); // Nút TRẢ thiết bị

module.exports = router;
