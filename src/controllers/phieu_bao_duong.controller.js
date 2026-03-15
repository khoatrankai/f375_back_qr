const phieuBDService = require("../services/phieu_bao_duong.service");
const { getReqInfo } = require("../utils/requestHelper");

const getDanhSachPhieu = (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const data = phieuBDService.layDanhSachPhieuBD(searchQuery);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getChiTietPhieu = (req, res) => {
  try {
    const data = phieuBDService.layChiTietPhieuBD(req.params.id);
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu!" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPhieu = (req, res) => {
  try {
    const { danh_sach_thiet_bi_ids, ...phieuData } = req.body;

    if (!phieuData.ma_phieu || !phieuData.loai_cong_viec_id) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin bắt buộc!" });
    }

    const newId = phieuBDService.taoPhieuBD(
      phieuData,
      danh_sach_thiet_bi_ids || [],
      getReqInfo(req),
    );
    res.status(201).json({
      success: true,
      message: "Tạo phiếu thành công!",
      data: { id: newId },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã phiếu đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const completeBaoDuong = (req, res) => {
  try {
    const phieuId = req.params.id;
    // ket_qua là mảng chứa: { chi_tiet_id, cap_chat_luong_sau, noi_dung_thuc_hien }
    const { chi_tiet } = req.body;

    if (!chi_tiet || !Array.isArray(chi_tiet)) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu kết quả không hợp lệ!" });
    }

    phieuBDService.hoanThanhBD(phieuId, chi_tiet, getReqInfo(req));
    res
      .status(200)
      .json({ success: true, message: "Hoàn tất bảo dưỡng thiết bị!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDanhSachPhieu,
  getChiTietPhieu,
  createPhieu,
  completeBaoDuong,
};
