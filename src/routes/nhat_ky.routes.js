const express = require("express");
const router = express.Router();
const nhatKyController = require("../controllers/nhat_ky.controller");

router.get("/", nhatKyController.getDanhSachNhatKy);
router.get("/ip", nhatKyController.testIP);

module.exports = router;
