const express = require("express");
const router = express.Router();
const khoController = require("../controllers/kho.controller");

router.get("/thong-ke-the", khoController.getThongKeTheKho);
router.get("/phieu-giao-dich", khoController.getLichSuPhieuKho); // Cho bảng Lịch sử phiếu

router.get("/phieu-giao-dich/:id", khoController.getChiTietPhieuKho);
router.post("/nhap-kho", khoController.createPhieuNhapKho);
router.post("/nhap-kho/qr", khoController.importKhoByQR);
router.post("/xuat-excel/:id", khoController.exportExcelKhoByID);
router.post("/nhap-kho-excel", khoController.importKhoExcel);
router.post("/xuat-kho", khoController.createPhieuXuatKho);

router.post("/phieu/giai-ma", khoController.decryptPhieuKho);
router.post("/phieu/:id/ma-hoa", khoController.encryptPhieuKho);
router.get("/dv/:dv", khoController.getKhoTheoDV);
// 2. NHÓM API TỒN KHO
router.get("/ton-kho", khoController.getDanhSachTonKho); // Bảng tồn kho tổng hợp
router.get("/ton-kho/chi-tiet", khoController.getTonKhoChiTiet); // Chi tiết cấp 1,2,3,4
router.get("/ton-kho/san-pham/:spId", khoController.getTonKhoTheoSanPham);

router.get("/", khoController.getAllKho); // GET /api/kho
router.get("/:id", khoController.getKhoById); // GET /api/kho/:id
router.post("/", khoController.createKho); // POST /api/kho
router.put("/:id", khoController.updateKho); // PUT /api/kho/:id
router.delete("/:id", khoController.deleteKho); // DELETE /api/kho/:id

module.exports = router;
