const phieuMuonTraService = require("../services/phieu_muon_tra.service");
const { getReqInfo } = require("../utils/requestHelper");

const getThongKeMuonTra = (req, res) => {
  try {
    const data = phieuMuonTraService.layThongKeMuonTra();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDanhSachPhieu = (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const data = phieuMuonTraService.layDanhSachPhieuMuon(searchQuery);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getChiTietPhieu = (req, res) => {
  try {
    const data = phieuMuonTraService.layChiTietPhieuMuon(req.params.id);
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu mượn!" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPhieu = (req, res) => {
  try {
    const { danh_sach_thiet_bi_ids, ...phieuData } = req.body;

    if (!phieuData.ma_phieu || !phieuData.nguoi_muon_id || !phieuData.han_tra) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin bắt buộc!" });
    }

    const newId = phieuMuonTraService.taoPhieuMuon(
      phieuData,
      danh_sach_thiet_bi_ids || [],
      getReqInfo(req),
    );
    res.status(201).json({
      success: true,
      message: "Tạo phiếu mượn thành công!",
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

const returnThietBi = (req, res) => {
  try {
    const id = req.params.id;
    phieuMuonTraService.traThietBi(id, getReqInfo(req));
    res
      .status(200)
      .json({ success: true, message: "Xác nhận trả thiết bị thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getThongKeMuonTra,
  getDanhSachPhieu,
  getChiTietPhieu,
  createPhieu,
  returnThietBi,
};
