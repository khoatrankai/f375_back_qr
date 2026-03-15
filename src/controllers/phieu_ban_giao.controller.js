const phieuBanGiaoService = require("../services/phieu_ban_giao.service");
const { getReqInfo } = require("../utils/requestHelper");

const getDanhSachPhieu = (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const data = phieuBanGiaoService.layDanhSachPhieu(searchQuery);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getChiTietPhieu = (req, res) => {
  try {
    const id = req.params.id;
    const data = phieuBanGiaoService.layChiTietPhieu(id);
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
    // Tách riêng data của Phiếu và mảng danh sách ID thiết bị
    const { danh_sach_thiet_bi_ids, ...phieuData } = req.body;

    if (!phieuData.ma_phieu || !phieuData.den_don_vi_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc (Mã phiếu, Đơn vị đến)!",
      });
    }

    const newId = phieuBanGiaoService.taoPhieuVaChiTiet(
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

const updatePhieu = (req, res) => {
  try {
    const id = req.params.id;
    // Tách riêng data của Phiếu và mảng danh sách ID thiết bị (nếu có cập nhật lại danh sách)
    const { danh_sach_thiet_bi_ids, ...phieuData } = req.body;

    phieuBanGiaoService.capNhatPhieu(
      id,
      phieuData,
      danh_sach_thiet_bi_ids,
      getReqInfo(req),
    );

    res
      .status(200)
      .json({ success: true, message: "Cập nhật phiếu bàn giao thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePhieu = (req, res) => {
  try {
    const id = req.params.id;
    const changes = phieuBanGiaoService.xoaPhieu(id, getReqInfo(req));

    if (changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu bàn giao để xóa!",
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Xóa phiếu bàn giao thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const encryptPhieu = (req, res) => {
  try {
    const id = req.params.id;
    const { secret_key } = req.body;

    if (!secret_key)
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng cung cấp secret_key (mật khẩu) để mã hóa!",
        });

    const chuoiMaHoa = phieuBanGiaoService.maHoaPhieuBanGiao(id, secret_key);
    res
      .status(200)
      .json({
        success: true,
        message: "Mã hóa thành công!",
        data: { crypto_string: chuoiMaHoa },
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API Giải mã phiếu
const decryptPhieu = (req, res) => {
  try {
    const { crypto_string, secret_key } = req.body;

    if (!crypto_string || !secret_key) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng cung cấp chuỗi mã hóa và mật khẩu!",
        });
    }

    const dataGoc = phieuBanGiaoService.giaiMaPhieuBanGiao(
      crypto_string,
      secret_key,
    );
    res
      .status(200)
      .json({ success: true, message: "Giải mã thành công!", data: dataGoc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDanhSachPhieu,
  getChiTietPhieu,
  createPhieu,
  deletePhieu,
  updatePhieu,
  encryptPhieu,
  decryptPhieu,
};
