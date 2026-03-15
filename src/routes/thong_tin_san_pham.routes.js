const express = require("express");
const router = express.Router();
const sanPhamController = require("../controllers/thong_tin_san_pham.controller");

router.get("/thong-ke", sanPhamController.getDashboardStats);
router.get("/ton-kho-chi-tiet", sanPhamController.getTonKhoChiTiet);
router.get("/tung-cai", sanPhamController.getDanhSachTrangBiTungCai);

router.get("/kho/:khoId/trang-bi", sanPhamController.getTrangBiThucTeTheoKho);
// ======= 2 DÒNG MỚI THÊM VÀO ĐÂY =======
router.post("/tung-cai", sanPhamController.createTrangBiThucTe);

router.post("/tung-cai/qr/giai-ma", sanPhamController.decryptChiTietQR);
router.post("/tung-cai/qr/:maQR/ma-hoa", sanPhamController.encryptChiTietQR);
router.get("/tung-cai/qr/:maQR/full", sanPhamController.getChiTietVaLichSuByQR);
router.get("/tung-cai/:id/lich-su", sanPhamController.getLichSuTrangBi);
router.get("/tung-cai/qr/:maQR", sanPhamController.getTrangBiByQR);
router.post("/tung-cai/batch", sanPhamController.createNhieuTrangBiThucTe);

router.put("/tung-cai/:id", sanPhamController.updateTrangBiThucTe);
router.delete("/tung-cai/:id", sanPhamController.deleteTrangBiThucTe);
// =======================================

router.get("/", sanPhamController.getAllSanPham);
router.get("/:id", sanPhamController.getSanPhamById);
router.get("/:id/phan-bo-kho", sanPhamController.getPhanBoKhoBySanPham);

router.post("/", sanPhamController.createSanPham); // Cái này là tạo Dòng sản phẩm
router.put("/:id", sanPhamController.updateSanPham);
router.delete("/:id", sanPhamController.deleteSanPham);

module.exports = router;
