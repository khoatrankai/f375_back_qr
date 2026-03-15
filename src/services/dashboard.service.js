const db = require("../config/database");

const layThongKeDashboard = () => {
  // 1. THỐNG KÊ 4 THẺ CARD & PHÂN BỔ TRẠNG THÁI (Thanh Progress)
  const statsQuery = db
    .prepare(
      `
        SELECT 
            COUNT(*) AS tong_trang_bi,
            SUM(CASE WHEN trang_thai = 'TRONG_KHO' THEN 1 ELSE 0 END) AS trong_kho,
            SUM(CASE WHEN trang_thai = 'DANG_MUON' THEN 1 ELSE 0 END) AS dang_muon,
            SUM(CASE WHEN trang_thai = 'DANG_BAO_DUONG' THEN 1 ELSE 0 END) AS bao_duong,
            
            -- Tính số lượng thiết bị MỚI thêm trong tháng này (để làm chỉ số Tăng/Giảm)
            SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN 1 ELSE 0 END) AS moi_thang_nay,
            SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month') THEN 1 ELSE 0 END) AS moi_thang_truoc
        FROM trang_bi_thuc_te
    `,
    )
    .get();

  // Xử lý an toàn dữ liệu
  const tong = statsQuery.tong_trang_bi || 0;
  const trong_kho = statsQuery.trong_kho || 0;
  const dang_muon = statsQuery.dang_muon || 0;
  const bao_duong = statsQuery.bao_duong || 0;

  // 2. BIỂU ĐỒ HOẠT ĐỘNG MƯỢN/TRẢ (6 THÁNG QUA)
  // Lấy số lượng phiếu mượn được tạo theo từng tháng trong 6 tháng gần nhất
  const chartQuery = db
    .prepare(
      `
        SELECT 
            strftime('%m', ngay_muon) AS thang,
            COUNT(*) AS so_luong
        FROM phieu_muon_tra
        WHERE ngay_muon >= date('now', 'start of month', '-5 months')
        GROUP BY thang
        ORDER BY ngay_muon ASC
    `,
    )
    .all();

  // Format lại dữ liệu biểu đồ cho Frontend (VD: [{ name: 'T1', value: 89 }, ...])
  const bieu_do_6_thang = chartQuery.map((row) => ({
    name: `T${parseInt(row.thang)}`, // Chuyển "03" thành "T3"
    value: row.so_luong,
  }));

  // 3. DANH SÁCH CẢNH BÁO / NHẮC NHỞ
  const canh_bao = [];

  // A. Quá hạn mượn
  const phieuQuaHan = db
    .prepare(
      `
        SELECT COUNT(*) as count FROM phieu_muon_tra 
        WHERE trang_thai = 'DANG_MUON' AND han_tra < date('now')
    `,
    )
    .get().count;
  if (phieuQuaHan > 0)
    canh_bao.push({
      loai: "danger",
      thong_diep: `${phieuQuaHan} phiếu mượn đã quá hạn cần xử lý`,
    });

  // B. Thiết bị cấp 4 (Cần bảo dưỡng)
  const thietBiCap4 = db
    .prepare(
      `
        SELECT COUNT(*) as count FROM trang_bi_thuc_te 
        WHERE cap_chat_luong = 4 AND trang_thai != 'DANG_BAO_DUONG'
    `,
    )
    .get().count;
  if (thietBiCap4 > 0)
    canh_bao.push({
      loai: "warning",
      thong_diep: `${thietBiCap4} thiết bị cấp 4 cần bảo dưỡng khẩn cấp`,
    });

  // C. Phiếu bàn giao chờ duyệt
  const phieuChoDuyet = db
    .prepare(
      `
        SELECT COUNT(*) as count FROM phieu_ban_giao 
        WHERE trang_thai = 'CHO_DUYET'
    `,
    )
    .get().count;
  if (phieuChoDuyet > 0)
    canh_bao.push({
      loai: "info",
      thong_diep: `${phieuChoDuyet} phiếu bàn giao chờ phê duyệt`,
    });

  // 4. TRẢ VỀ KẾT QUẢ GỘP CHUẨN FORM FRONTEND
  return {
    tong_quan: {
      tong_trang_bi: {
        gia_tri: tong,
        // Trend = chênh lệch thêm mới tháng này vs tháng trước
        trend: statsQuery.moi_thang_nay - statsQuery.moi_thang_truoc,
      },
      dang_cho_muon: {
        gia_tri: dang_muon,
        // Giả lập logic trend cho mượn (Có thể tùy chỉnh)
        trend: 5,
      },
      dang_bao_duong: {
        gia_tri: bao_duong,
        trend: -3,
      },
      trong_kho: {
        gia_tri: trong_kho,
        trend: 10,
      },
    },
    phan_bo_trang_thai: {
      trong_kho_pct: tong > 0 ? Math.round((trong_kho / tong) * 100) : 0,
      dang_muon_pct: tong > 0 ? Math.round((dang_muon / tong) * 100) : 0,
      bao_duong_pct: tong > 0 ? Math.round((bao_duong / tong) * 100) : 0,
    },
    bieu_do_hoat_dong: bieu_do_6_thang,
    canh_bao_nhac_nho: canh_bao,
  };
};

module.exports = {
  layThongKeDashboard,
};
