// src/utils/cryptoHelper.js
const crypto = require("crypto");
const zlib = require("zlib");
const ALGORITHM = "aes-256-cbc";

// Hàm phụ: Tạo ra key đúng 32 byte từ mật khẩu người dùng nhập vào
const getDerivedKey = (password) => {
  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("base64")
    .substring(0, 32);
};

// Hàm mã hóa: Chuyển Object/Text thành chuỗi mã hóa
const encryptData = (data, password) => {
  try {
    const text = typeof data === "object" ? JSON.stringify(data) : String(data);

    // 1. Nén dữ liệu JSON trước khi mã hóa (Giảm dung lượng)
    const compressedData = zlib.deflateSync(text);

    const iv = crypto.randomBytes(16);
    const key = getDerivedKey(password);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 2. Mã hóa dữ liệu đã nén
    let encrypted = cipher.update(compressedData);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // 3. Xuất ra Base64 thay vì hex để chuỗi ngắn nhất có thể
    return iv.toString("base64") + ":" + encrypted.toString("base64");
  } catch (error) {
    throw new Error("Lỗi khi mã hóa dữ liệu: " + error.message);
  }
};

const decryptData = (encryptedText, password) => {
  try {
    const textParts = encryptedText.split(":");
    if (textParts.length !== 2)
      throw new Error("Định dạng chuỗi không hợp lệ!");

    // Đọc lại từ Base64
    const iv = Buffer.from(textParts.shift(), "base64");
    const encryptedTextBuffer = Buffer.from(textParts.join(":"), "base64");
    const key = getDerivedKey(password);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decryptedCompressed = decipher.update(encryptedTextBuffer);
    decryptedCompressed = Buffer.concat([
      decryptedCompressed,
      decipher.final(),
    ]);

    // Giải nén ngược lại
    const decrypted = zlib.inflateSync(decryptedCompressed).toString("utf8");

    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(
      "Giải mã thất bại! Có thể do sai mật khẩu hoặc chuỗi bị hỏng.",
    );
  }
};

module.exports = {
  encryptData,
  decryptData,
};
