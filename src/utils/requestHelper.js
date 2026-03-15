// src/utils/requestHelper.js

const os = require("os");

/**
 * Lấy IP server
 */
function getServerIp() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return null;
}

/**
 * Lấy MAC address của server
 */
function getServerMac() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (!net.internal && net.mac && net.mac !== "00:00:00:00:00:00") {
        return net.mac;
      }
    }
  }

  return null;
}

/**
 * Lấy thông tin request
 */
const getReqInfo = (req) => {
  //   let ip = req.headers["x-forwarded-for"];

  // Nếu qua proxy có nhiều IP
  //   if (ip) {
  //     ip = ip.split(",")[0].trim();
  //   } else {
  //     ip =
  //       req.socket?.remoteAddress ||
  //       req.connection?.remoteAddress ||
  //       req.ip ||
  //       "";
  //   }

  // Convert IPv6 localhost
  //   if (ip === "::1") {
  //     ip = "127.0.0.1";
  //   }

  // Convert dạng ::ffff:192.168.x.x
  //   if (ip && ip.includes("::ffff:")) {
  //     ip = ip.replace("::ffff:", "");
  //   }

  //   // Nếu không có IP client -> lấy IP server
  //   if (!ip) {
  //     ip = getServerIp();
  //   }
  let ip = getServerIp();
  // Nếu vẫn không có -> dùng MAC
  if (!ip) {
    ip = getServerMac();
  }

  // Lấy userId
  const userId = req.user?.id || req.body?.user_id || null;

  return { ip, userId };
};

module.exports = { getReqInfo };
