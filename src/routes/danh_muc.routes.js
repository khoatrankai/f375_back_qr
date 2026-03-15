const express = require("express");
const router = express.Router();
const danhMucController = require("../controllers/danh_muc.controller");

router.get("/tree", danhMucController.getDanhMucTree);
router.get("/", danhMucController.getAllDanhMuc); // GET /api/danh-muc
router.get("/:id", danhMucController.getDanhMucById); // GET /api/danh-muc/:id
router.post("/", danhMucController.createDanhMuc); // POST /api/danh-muc
router.put("/:id", danhMucController.updateDanhMuc); // PUT /api/danh-muc/:id
router.delete("/:id", danhMucController.deleteDanhMuc); // DELETE /api/danh-muc/:id

module.exports = router;
