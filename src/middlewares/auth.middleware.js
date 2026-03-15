const jwt = require("jsonwebtoken");

// Đặt Secret Key (Thực tế nên để trong file .env)
const JWT_SECRET = process.env.JWT_SECRET || "ChuoiBaoMatCuaHeThongQuanSu2026";

const verifyToken = (req, res, next) => {
  // 1. Lấy token từ header 'Authorization: Bearer <token>'
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Không tìm thấy Token xác thực. Vui lòng đăng nhập!",
    });
  }

  const token = authHeader.split(" ")[1];
  console.log(token);
  try {
    // 2. Giải mã token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Gắn thông tin user vào request để các Controller/Service dùng lại (VD: để ghi Lịch sử, Nhật ký)
    req.user = decoded;

    // 4. Cho phép đi tiếp vào Controller
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "Phiên đăng nhập đã hết hạn!" });
    }
    return res.status(403).json({
      success: false,
      message: "Token không hợp lệ hoặc đã bị thay đổi!",
    });
  }
};

// Cập nhật lại Helper getReqInfo để tự động lấy userId từ Token
const getReqInfoFromToken = (req) => {
  return {
    userId: req.user ? req.user.id : null,
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
  };
};

module.exports = { verifyToken, getReqInfoFromToken, JWT_SECRET };
