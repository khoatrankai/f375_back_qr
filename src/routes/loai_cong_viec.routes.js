const express = require("express");
const router = express.Router();
const loaiCVController = require("../controllers/loai_cong_viec.controller");

router.get("/", loaiCVController.getAllLoaiCV); // GET /api/loai-cong-viec
router.get("/:id", loaiCVController.getLoaiCVById); // GET /api/loai-cong-viec/:id
router.post("/", loaiCVController.createLoaiCV); // POST /api/loai-cong-viec
router.put("/:id", loaiCVController.updateLoaiCV); // PUT /api/loai-cong-viec/:id
router.delete("/:id", loaiCVController.deleteLoaiCV); // DELETE /api/loai-cong-viec/:id

module.exports = router;
