const dashboardService = require("../services/dashboard.service");

const getOverviewDashboard = (req, res) => {
  try {
    const data = dashboardService.layThongKeDashboard();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Lỗi Dashboard:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOverviewDashboard,
};
