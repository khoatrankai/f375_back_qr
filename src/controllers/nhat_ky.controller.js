const nhatKyService = require("../services/nhat_ky.service");
const { getReqInfo } = require("../utils/requestHelper");

const getDanhSachNhatKy = (req, res) => {
  try {
    // Phân trang đơn giản
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const data = nhatKyService.layDanhSachNhatKy(limit, offset);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const testIP = (req, res) => {
  try {
    console.log(getReqInfo(req));
    res
      .status(200)
      .json({ success: true, message: "Cập nhật đơn vị thành công!" });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã đơn vị đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDanhSachNhatKy,
  testIP,
};
