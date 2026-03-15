const express = require("express");
const cors = require("cors");
const routes = require("./routes"); // Tự động trỏ vào src/routes/index.js
// const { verifyToken } = require("./middlewares/auth.middleware");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Gắn toàn bộ Routes
app.use("/api", routes);

// Middleware xử lý lỗi chung (Error Handler)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Lỗi máy chủ nội bộ!",
    error: err.message,
  });
});

module.exports = app;
