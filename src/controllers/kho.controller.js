const khoService = require("../services/kho.service");
const { getReqInfo } = require("../utils/requestHelper");

const getAllKho = (req, res) => {
  try {
    const data = khoService.layDanhSachKhoChiTiet();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getKhoById = (req, res) => {
  try {
    const id = req.params.id;
    const data = khoService.layKhoTheoId(id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy kho!" });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createKho = (req, res) => {
  try {
    const newId = khoService.taoKho(req.body, getReqInfo(req));
    res.status(201).json({
      success: true,
      message: "Tạo kho thành công!",
      data: { id: newId },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã kho đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateKho = (req, res) => {
  try {
    const id = req.params.id;
    const changes = khoService.capNhatKho(id, req.body, getReqInfo(req));

    if (changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy kho để cập nhật!" });
    }
    res
      .status(200)
      .json({ success: true, message: "Cập nhật kho thành công!" });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã kho đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteKho = (req, res) => {
  try {
    const id = req.params.id;
    const changes = khoService.xoaKho(id, getReqInfo(req));

    if (changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy kho để xóa!" });
    }
    res.status(200).json({ success: true, message: "Xóa kho thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getThongKeTheKho = (req, res) => {
  try {
    const data = khoService.layThongKeTheKho();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLichSuPhieuKho = (req, res) => {
  try {
    const data = khoService.layLichSuPhieuKho();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= NHÓM API TỒN KHO =================

const getDanhSachTonKho = (req, res) => {
  try {
    const data = khoService.layDanhSachTonKho();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTonKhoTheoSanPham = (req, res) => {
  try {
    const spId = req.params.spId;
    const data = khoService.layTonKhoTheoSanPham(spId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTonKhoChiTiet = (req, res) => {
  try {
    const data = khoService.layTonKhoChiTiet();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getKhoTheoDV = (req, res) => {
  try {
    const dvId = req.params.dv;
    const data = khoService.layTatCaKhoByDV(dvId);

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPhieuNhapKho = (req, res) => {
  try {
    const { phieu_data, danh_sach_trang_bi } = req.body;

    if (!phieu_data || !phieu_data.ma_phieu || !phieu_data.kho_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin phiếu nhập kho bắt buộc!",
      });
    }

    if (
      !danh_sach_trang_bi ||
      !Array.isArray(danh_sach_trang_bi) ||
      danh_sach_trang_bi.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Danh sách trang bị nhập không được để trống!",
      });
    }

    const data = khoService.nhapKhoMoi(
      phieu_data,
      danh_sach_trang_bi,
      getReqInfo(req),
    );

    res.status(201).json({
      success: true,
      message: "Nhập kho thành công!",
      data: data, // Dữ liệu trả về sẽ bao gồm list mã QR để in
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({
        success: false,
        message: "Mã phiếu hoặc Mã QR/Serial bị trùng lặp!",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getChiTietPhieuKho = (req, res) => {
  try {
    const id = req.params.id; // ID của phiếu kho
    const data = khoService.layChiTietPhieuKho(id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu kho!" });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPhieuXuatKho = (req, res) => {
  try {
    const { phieu_data, danh_sach_trang_bi } = req.body;

    if (!phieu_data || !phieu_data.ma_phieu || !phieu_data.kho_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin phiếu xuất kho bắt buộc!",
      });
    }

    if (
      !danh_sach_trang_bi ||
      !Array.isArray(danh_sach_trang_bi) ||
      danh_sach_trang_bi.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Bạn phải chọn ít nhất 1 thiết bị để xuất kho!",
      });
    }

    const phieuId = khoService.xuatKho(
      phieu_data,
      danh_sach_trang_bi,
      getReqInfo(req),
    );

    res.status(201).json({
      success: true,
      message: `Xuất thành công ${danh_sach_trang_bi.length} thiết bị!`,
      data: { phieu_kho_id: phieuId },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã phiếu xuất đã tồn tại!" });
    }
    // Trả về lỗi nếu thiết bị không nằm trong kho (Bắt từ throw new Error ở service)
    res.status(400).json({ success: false, message: error.message });
  }
};

const encryptPhieuKho = (req, res) => {
  try {
    const phieuId = req.params.id;
    const { secret_key } = req.body;

    if (!secret_key) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp secret_key (mật khẩu) để mã hóa!",
      });
    }

    const chuoiMaHoa = khoService.maHoaPhieuKho(phieuId, secret_key);
    res.status(200).json({
      success: true,
      message: "Mã hóa phiếu kho thành công!",
      data: { crypto_string: chuoiMaHoa },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const decryptPhieuKho = (req, res) => {
  try {
    const { crypto_string, secret_key } = req.body;

    if (!crypto_string || !secret_key) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ chuỗi mã hóa và mật khẩu!",
      });
    }

    const dataGoc = khoService.giaiMaPhieuKho(crypto_string, secret_key);
    res.status(200).json({
      success: true,
      message: "Giải mã phiếu kho thành công!",
      data: dataGoc,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const importKhoByQR = (req, res) => {
  try {
    const { crypto_string, secret_key, kho_nhan_id } = req.body;

    if (!crypto_string || !secret_key || !kho_nhan_id) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng cung cấp đầy đủ: chuỗi mã hóa, mật khẩu và ID kho nhận!",
      });
    }

    const reqInfo = getReqInfo(req);

    // Gọi Service
    const ketQua = khoService.nhapKhoTuMaHoa(
      crypto_string,
      secret_key,
      kho_nhan_id,
      reqInfo.userId,
      reqInfo,
    );

    res.status(201).json({
      success: true,
      message: `Tuyệt vời! Đã nhập kho thành công ${ketQua.so_luong_nhap} thiết bị từ mã QR.`,
      data: ketQua,
    });
  } catch (error) {
    // Bắt lỗi giải mã thất bại hoặc dữ liệu hỏng
    res.status(400).json({ success: false, message: error.message });
  }
};

const exportExcelKhoByID = (req, res) => {
  try {
    const phieuId = req.params.id;

    const data = khoService.layChiTietPhieuKhoQR(phieuId);
    res.status(200).json({
      success: true,
      message: "Lấy phiếu kho thành công!",
      data: data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API Mới: Nhập kho thông minh (Upsert từ Excel / API thứ 3)
const importKhoExcel = (req, res) => {
  try {
    const reqInfo = getReqInfo(req); // Lấy IP, UserId để ghi log

    // Gọi thẳng vào Service mới tạo
    const ketQua = khoService.nhapKhoExcel(req.body, reqInfo);

    res.status(201).json({
      success: true,
      message: `Nhập kho thành công ${ketQua.so_luong_nhap} thiết bị.`,
      data: ketQua,
    });
  } catch (error) {
    console.error("Lỗi Import Kho Thông Minh:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllKho,
  getKhoById,
  createKho,
  updateKho,
  deleteKho,
  getThongKeTheKho,
  getLichSuPhieuKho,
  getDanhSachTonKho,
  getTonKhoTheoSanPham,
  getTonKhoChiTiet,
  getKhoTheoDV,
  createPhieuNhapKho,
  getChiTietPhieuKho,
  createPhieuXuatKho,
  encryptPhieuKho,
  decryptPhieuKho,
  importKhoByQR,
  exportExcelKhoByID,
  importKhoExcel,
};
