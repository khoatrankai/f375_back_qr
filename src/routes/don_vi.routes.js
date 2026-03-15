const express = require("express");
const router = express.Router();
const donViController = require("../controllers/don_vi.controller");

// Nếu bạn đã cài đặt Middleware xác thực Token (JWT), hãy uncomment dòng dưới đây:
// const { verifyToken } = require("../middlewares/auth.middleware");
// router.use(verifyToken);
router.get("/tree", donViController.getDonViTree);
router.get("/", donViController.getAllDonVi); // GET /api/don-vi
router.get("/:id", donViController.getDonViById); // GET /api/don-vi/:id
router.post("/", donViController.createDonVi); // POST /api/don-vi
router.put("/:id", donViController.updateDonVi); // PUT /api/don-vi/:id
router.delete("/:id", donViController.deleteDonVi); // DELETE /api/don-vi/:id

module.exports = router;
