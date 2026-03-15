const sanPhamService = require("../services/thong_tin_san_pham.service");
const { getReqInfo } = require("../utils/requestHelper");

// API cho 4 ô thống kê trên cùng
const getDashboardStats = (req, res) => {
  try {
    const data = sanPhamService.layThongKeTongQuan();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllSanPham = (req, res) => {
  try {
    const data = sanPhamService.layTatCaSanPham();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSanPhamById = (req, res) => {
  try {
    const id = req.params.id;
    const data = sanPhamService.laySanPhamTheoId(id);

    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm!" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSanPham = (req, res) => {
  try {
    const newId = sanPhamService.taoSanPham(req.body, getReqInfo(req));
    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công!",
      data: { id: newId },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(400)
        .json({ success: false, message: "Mã sản phẩm đã tồn tại!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSanPham = (req, res) => {
  try {
    const id = req.params.id;
    const changes = sanPhamService.capNhatSanPham(
      id,
      req.body,
      getReqInfo(req),
    );

    if (changes === 0)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm!" });
    res.status(200).json({ success: true, message: "Cập nhật thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSanPham = (req, res) => {
  try {
    const id = req.params.id;
    const changes = sanPhamService.xoaSanPham(id, getReqInfo(req));

    if (changes === 0)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm!" });
    res.status(200).json({ success: true, message: "Xóa thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createTrangBiThucTe = (req, res) => {
  try {
    if (!req.body.thong_tin_sp_id) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID dòng sản phẩm!" });
    }

    const newId = sanPhamService.taoTrangBiThucTe(req.body, getReqInfo(req));
    res.status(201).json({
      success: true,
      message: "Thêm cá thể trang bị thành công!",
      data: { id: newId },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({
        success: false,
        message: "Mã QR hoặc Số Serial đã tồn tại trên hệ thống!",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const createNhieuTrangBiThucTe = (req, res) => {
  try {
    const { danh_sach } = req.body;

    if (!danh_sach || !Array.isArray(danh_sach) || danh_sach.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu danh sách không hợp lệ!" });
    }

    const insertedIds = sanPhamService.taoNhieuTrangBiThucTe(
      danh_sach,
      getReqInfo(req),
    );
    res.status(201).json({
      success: true,
      message: `Thêm thành công lô ${insertedIds.length} trang bị!`,
      data: { ids: insertedIds },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({
        success: false,
        message: "Có cá thể bị trùng Mã QR hoặc Số Serial!",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTonKhoChiTiet = (req, res) => {
  try {
    const data = sanPhamService.layTonKhoChiTiet();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Thêm hàm lấy Phân Bổ Kho của 1 sản phẩm cụ thể (Cho nút click mũi tên >)
const getPhanBoKhoBySanPham = (req, res) => {
  try {
    const id = req.params.id; // Lấy ID sản phẩm từ URL
    const data = sanPhamService.layPhanBoKhoTheoSanPham(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Thêm hàm lấy danh sách trang bị thực tế từng cái (Cho Tab Từng cái - có hỗ trợ tìm kiếm)
const getDanhSachTrangBiTungCai = (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const statusFilter = req.query.status || "";
    const khoFilter = req.query.kho || "";

    const data = sanPhamService.layDanhSachTrangBiTungCai(
      searchQuery,
      statusFilter,
      khoFilter,
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTrangBiThucTe = (req, res) => {
  try {
    const id = req.params.id;
    const changes = sanPhamService.capNhatTrangBiThucTe(
      id,
      req.body,
      getReqInfo(req),
    );

    if (changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy trang bị để cập nhật!",
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Cập nhật cá thể trang bị thành công!" });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({
        success: false,
        message: "Số Serial đã tồn tại trên thiết bị khác!",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Xóa Từng cái
const deleteTrangBiThucTe = (req, res) => {
  try {
    const id = req.params.id;
    const changes = sanPhamService.xoaTrangBiThucTe(id, getReqInfo(req));

    if (changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy trang bị để xóa!" });
    }
    res
      .status(200)
      .json({ success: true, message: "Xóa cá thể trang bị thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTrangBiThucTeTheoKho = (req, res) => {
  try {
    const khoId = req.params.khoId;
    const data = sanPhamService.layTrangBiThucTeTheoKho(khoId);

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTrangBiByQR = (req, res) => {
  try {
    const maQR = req.params.maQR;
    const data = sanPhamService.layTrangBiTheoMaQR(maQR);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị nào với mã QR này!",
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLichSuTrangBi = (req, res) => {
  try {
    const data = sanPhamService.layLichSuTheoTrangBi(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getChiTietVaLichSuByQR = (req, res) => {
  try {
    const maQR = req.params.maQR;

    // 1. Lấy thông tin chi tiết của thiết bị bằng mã QR
    const thietBi = sanPhamService.layTrangBiTheoMaQR(maQR);

    if (!thietBi) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị nào với mã QR này!",
      });
    }

    // 2. Nếu có thiết bị, dùng ID của nó để lấy toàn bộ lịch sử
    // Lưu ý: Trong hàm layTrangBiTheoMaQR mình đã AS id thành trang_bi_id
    const lichSu = sanPhamService.layLichSuTheoTrangBi(thietBi.trang_bi_id);

    // 3. Gộp cả 2 cục data lại và trả về cho Frontend
    res.status(200).json({
      success: true,
      data: {
        thong_tin: thietBi,
        lich_su: lichSu,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const encryptChiTietQR = (req, res) => {
  try {
    const maQR = req.params.maQR;
    const { secret_key } = req.body;

    if (!secret_key)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng cung cấp secret_key!" });

    const chuoiMaHoa = sanPhamService.maHoaChiTietVaLichSu(maQR, secret_key);
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

const decryptChiTietQR = (req, res) => {
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

    const dataGoc = sanPhamService.giaiMaChiTietVaLichSu(
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
  getDashboardStats,
  getAllSanPham,
  getSanPhamById,
  createSanPham,
  updateSanPham,
  deleteSanPham,
  createTrangBiThucTe,
  createNhieuTrangBiThucTe,
  getTonKhoChiTiet,
  getPhanBoKhoBySanPham,
  getDanhSachTrangBiTungCai,
  updateTrangBiThucTe,
  deleteTrangBiThucTe,
  getTrangBiThucTeTheoKho,
  getTrangBiByQR,
  getLichSuTrangBi,
  getChiTietVaLichSuByQR,
  encryptChiTietQR,
  decryptChiTietQR,
};
