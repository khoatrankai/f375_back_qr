const express = require("express");
const router = express.Router();
const phieuBanGiaoController = require("../controllers/phieu_ban_giao.controller");

router.get("/", phieuBanGiaoController.getDanhSachPhieu);

router.post("/giai-ma", phieuBanGiaoController.decryptPhieu);
router.post("/:id/ma-hoa", phieuBanGiaoController.encryptPhieu);
router.get("/:id", phieuBanGiaoController.getChiTietPhieu);
router.post("/", phieuBanGiaoController.createPhieu);

router.put("/:id", phieuBanGiaoController.updatePhieu);
router.delete("/:id", phieuBanGiaoController.deletePhieu);

module.exports = router;
