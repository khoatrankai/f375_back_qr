const systemService = require("../services/system.service");

const getDonVi = (req, res) => {
  try {
    const data = systemService.layTatCaDonVi();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDonVi = (req, res) => {
  try {
    const newId = systemService.taoDonVi(req.body);
    res
      .status(201)
      .json({
        success: true,
        message: "Tạo đơn vị thành công",
        data: { id: newId },
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getDonVi, createDonVi };
