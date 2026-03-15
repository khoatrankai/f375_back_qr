const loaiCVService = require("../services/loai_cong_viec.service");
const { getReqInfo } = require("../utils/requestHelper");

const getAllLoaiCV = (req, res) => {
  try {
    const data = loaiCVService.layTatCaLoaiCV();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLoaiCVById = (req, res) => {
  try {
    const id = req.params.id;
    const data = loaiCVService.layLoaiCVTheoId(id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy loại công việc!" });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createLoaiCV = (req, res) => {
  try {
    const newId = loaiCVService.taoLoaiCV(req.body, getReqInfo(req));
    res.status(201).json({
      success: true,
      message: "Tạo loại công việc thành công!",
      data: { id: newId },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã loại công việc đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLoaiCV = (req, res) => {
  try {
    const id = req.params.id;
    const changes = loaiCVService.capNhatLoaiCV(id, req.body, getReqInfo(req));

    if (changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại công việc để cập nhật!",
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Cập nhật loại công việc thành công!" });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã loại công việc đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteLoaiCV = (req, res) => {
  try {
    const id = req.params.id;
    const changes = loaiCVService.xoaLoaiCV(id, getReqInfo(req));

    if (changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại công việc để xóa!",
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Xóa loại công việc thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllLoaiCV,
  getLoaiCVById,
  createLoaiCV,
  updateLoaiCV,
  deleteLoaiCV,
};
