const danhMucService = require("../services/danh_muc.service");
const { getReqInfo } = require("../utils/requestHelper");

const getAllDanhMuc = (req, res) => {
  try {
    const data = danhMucService.layTatCaDanhMuc();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDanhMucById = (req, res) => {
  try {
    const id = req.params.id;
    const data = danhMucService.layDanhMucTheoId(id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy danh mục!" });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDanhMuc = (req, res) => {
  try {
    const newId = danhMucService.taoDanhMuc(req.body, getReqInfo(req));
    res.status(201).json({
      success: true,
      message: "Tạo danh mục thành công!",
      data: { id: newId },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã danh mục đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDanhMuc = (req, res) => {
  try {
    const id = req.params.id;
    const changes = danhMucService.capNhatDanhMuc(
      id,
      req.body,
      getReqInfo(req),
    );

    if (changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục để cập nhật!",
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Cập nhật danh mục thành công!" });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã danh mục đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDanhMuc = (req, res) => {
  try {
    const id = req.params.id;
    const changes = danhMucService.xoaDanhMuc(id, getReqInfo(req));

    if (changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy danh mục để xóa!" });
    }
    res
      .status(200)
      .json({ success: true, message: "Xóa danh mục thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDanhMucTree = (req, res) => {
  try {
    const data = danhMucService.layCayDanhMuc();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllDanhMuc,
  getDanhMucById,
  createDanhMuc,
  updateDanhMuc,
  deleteDanhMuc,
  getDanhMucTree,
};
