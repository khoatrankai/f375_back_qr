const donViService = require("../services/don_vi.service");
const { getReqInfo } = require("../utils/requestHelper");

// [GET] Lấy danh sách đơn vị
const getAllDonVi = (req, res) => {
  try {
    const data = donViService.layTatCaDonVi();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] Lấy chi tiết đơn vị theo ID
const getDonViById = (req, res) => {
  try {
    const id = req.params.id;
    const data = donViService.layDonViTheoId(id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn vị!" });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] Thêm đơn vị mới
const createDonVi = (req, res) => {
  try {
    const newId = donViService.taoDonVi(req.body, getReqInfo(req));
    res.status(201).json({
      success: true,
      message: "Tạo đơn vị thành công!",
      data: { id: newId },
    });
  } catch (error) {
    // Xử lý lỗi trùng mã đơn vị (UNIQUE constraint)
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã đơn vị đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// [PUT] Cập nhật đơn vị
const updateDonVi = (req, res) => {
  try {
    const id = req.params.id;
    const changes = donViService.capNhatDonVi(id, req.body, getReqInfo(req));

    if (changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn vị để cập nhật!",
      });
    }
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

// [DELETE] Xóa đơn vị
const deleteDonVi = (req, res) => {
  try {
    const id = req.params.id;
    const changes = donViService.xoaDonVi(id, getReqInfo(req));

    if (changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn vị để xóa!" });
    }
    res.status(200).json({ success: true, message: "Xóa đơn vị thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDonViTree = (req, res) => {
  try {
    const data = donViService.layCayDonVi();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllDonVi,
  getDonViById,
  createDonVi,
  updateDonVi,
  deleteDonVi,
  getDonViTree,
};
