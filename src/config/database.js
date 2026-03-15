const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.resolve(__dirname, "../../app_database.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

// Đưa toàn bộ mã SQL CREATE TABLE và TRIGGER của bạn vào đây
db.exec(`
    -- ==========================================
    -- 1. Nhóm Quản lý Hệ thống & Đơn vị
    -- ==========================================
    CREATE TABLE IF NOT EXISTS don_vi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_don_vi TEXT UNIQUE NOT NULL,
        ten_don_vi TEXT NOT NULL,
        cap_tren_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cap_tren_id) REFERENCES don_vi(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'USER',
        don_vi_id INTEGER,
        is_active INTEGER DEFAULT 1,
        profile_data TEXT DEFAULT '{}', -- Giữ lại theo yêu cầu snippet của bạn
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK(json_valid(profile_data)),
        FOREIGN KEY (don_vi_id) REFERENCES don_vi(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS nhat_ky_he_thong (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        table_name TEXT,
        record_id INTEGER,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- ==========================================
    -- 2. Nhóm Danh mục
    -- ==========================================
    CREATE TABLE IF NOT EXISTS danh_muc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_danh_muc TEXT UNIQUE NOT NULL,
        ten_danh_muc TEXT NOT NULL,
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES danh_muc(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS loai_cong_viec (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_loai_cv TEXT UNIQUE NOT NULL,
        ten_loai_cv TEXT NOT NULL,
        mo_ta TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ==========================================
    -- 3. Nhóm Sản phẩm & Trang bị Thực tế
    -- ==========================================
    CREATE TABLE IF NOT EXISTS thong_tin_san_pham (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_san_pham TEXT UNIQUE NOT NULL,
        ten_san_pham TEXT NOT NULL,
        danh_muc_id INTEGER,
        don_vi_tinh TEXT,
        thong_so_ky_thuat TEXT,
        the_tich REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (danh_muc_id) REFERENCES danh_muc(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS kho (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_kho TEXT UNIQUE NOT NULL,
        ten_kho TEXT NOT NULL,
        don_vi_id INTEGER,
        vi_tri TEXT,
        suc_chua REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (don_vi_id) REFERENCES don_vi(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trang_bi_thuc_te (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thong_tin_sp_id INTEGER NOT NULL,
        so_serial TEXT,
        ma_qr TEXT UNIQUE NOT NULL,
        cap_chat_luong INTEGER NOT NULL,
        kho_id_hien_tai INTEGER,
        don_vi_quan_ly_id INTEGER,
        trang_thai TEXT DEFAULT 'TRONG_KHO',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thong_tin_sp_id) REFERENCES thong_tin_san_pham(id) ON DELETE CASCADE,
        FOREIGN KEY (kho_id_hien_tai) REFERENCES kho(id) ON DELETE SET NULL,
        FOREIGN KEY (don_vi_quan_ly_id) REFERENCES don_vi(id) ON DELETE SET NULL
    );

    -- ==========================================
    -- 4. Nhóm Quản lý Kho & Tồn Kho
    -- ==========================================
    CREATE TABLE IF NOT EXISTS ton_kho (
        kho_id INTEGER,
        thong_tin_sp_id INTEGER,
        so_luong_cap1 INTEGER DEFAULT 0,
        so_luong_cap2 INTEGER DEFAULT 0,
        so_luong_cap3 INTEGER DEFAULT 0,
        so_luong_cap4 INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (kho_id, thong_tin_sp_id),
        FOREIGN KEY (kho_id) REFERENCES kho(id) ON DELETE CASCADE,
        FOREIGN KEY (thong_tin_sp_id) REFERENCES thong_tin_san_pham(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS phieu_kho (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_phieu TEXT UNIQUE NOT NULL,
        loai_phieu TEXT NOT NULL,
        kho_id INTEGER NOT NULL,
        nguoi_lap_id INTEGER,
        ghi_chu TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kho_id) REFERENCES kho(id) ON DELETE CASCADE,
        FOREIGN KEY (nguoi_lap_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS chi_tiet_phieu_kho (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phieu_kho_id INTEGER NOT NULL,
        trang_bi_thuc_te_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (phieu_kho_id) REFERENCES phieu_kho(id) ON DELETE CASCADE,
        FOREIGN KEY (trang_bi_thuc_te_id) REFERENCES trang_bi_thuc_te(id) ON DELETE CASCADE
    );

    -- ==========================================
    -- 5. Nhóm Luân Chuyển (Bàn giao, Mượn trả)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS phieu_ban_giao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_phieu TEXT UNIQUE NOT NULL,
        tu_don_vi_id INTEGER,
        den_don_vi_id INTEGER NOT NULL,
        tu_kho_id INTEGER, 
        den_kho_id INTEGER,
        nguoi_ban_giao_id INTEGER,
        nguoi_nhan_id INTEGER,
        ngay_ban_giao DATETIME,
        trang_thai TEXT DEFAULT 'CHO_DUYET',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tu_don_vi_id) REFERENCES don_vi(id) ON DELETE SET NULL,
        FOREIGN KEY (den_don_vi_id) REFERENCES don_vi(id) ON DELETE CASCADE,
        FOREIGN KEY (tu_kho_id) REFERENCES kho(id) ON DELETE SET NULL,
        FOREIGN KEY (den_kho_id) REFERENCES kho(id) ON DELETE SET NULL,
        FOREIGN KEY (nguoi_ban_giao_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (nguoi_nhan_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS chi_tiet_ban_giao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phieu_ban_giao_id INTEGER NOT NULL,
        trang_bi_thuc_te_id INTEGER NOT NULL,
        ghi_chu_tinh_trang TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (phieu_ban_giao_id) REFERENCES phieu_ban_giao(id) ON DELETE CASCADE,
        FOREIGN KEY (trang_bi_thuc_te_id) REFERENCES trang_bi_thuc_te(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS phieu_muon_tra (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_phieu TEXT UNIQUE NOT NULL,
        nguoi_muon_id INTEGER NOT NULL,
        don_vi_muon_id INTEGER NOT NULL,
        ngay_muon DATETIME NOT NULL,
        han_tra DATETIME NOT NULL,
        ngay_tra_thuc_te DATETIME,
        trang_thai TEXT DEFAULT 'DANG_MUON',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nguoi_muon_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (don_vi_muon_id) REFERENCES don_vi(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chi_tiet_muon_tra (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phieu_muon_tra_id INTEGER NOT NULL,
        trang_bi_thuc_te_id INTEGER NOT NULL,
        cap_chat_luong_khi_muon INTEGER,
        cap_chat_luong_khi_tra INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (phieu_muon_tra_id) REFERENCES phieu_muon_tra(id) ON DELETE CASCADE,
        FOREIGN KEY (trang_bi_thuc_te_id) REFERENCES trang_bi_thuc_te(id) ON DELETE CASCADE
    );

    -- ==========================================
    -- 6. Nhóm Bảo dưỡng & Lịch sử
    -- ==========================================
    CREATE TABLE IF NOT EXISTS phieu_bao_duong (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_phieu TEXT UNIQUE NOT NULL,
        loai_cong_viec_id INTEGER NOT NULL,
        nguoi_phu_trach_id INTEGER,
        ngay_bat_dau DATETIME NOT NULL,
        ngay_hoan_thanh DATETIME,
        trang_thai TEXT DEFAULT 'DANG_XU_LY',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loai_cong_viec_id) REFERENCES loai_cong_viec(id) ON DELETE CASCADE,
        FOREIGN KEY (nguoi_phu_trach_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS chi_tiet_bao_duong (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phieu_bao_duong_id INTEGER NOT NULL,
        trang_bi_thuc_te_id INTEGER NOT NULL,
        noi_dung_thuc_hien TEXT,
        cap_chat_luong_truoc INTEGER,
        cap_chat_luong_sau INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (phieu_bao_duong_id) REFERENCES phieu_bao_duong(id) ON DELETE CASCADE,
        FOREIGN KEY (trang_bi_thuc_te_id) REFERENCES trang_bi_thuc_te(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lich_su_san_pham (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trang_bi_thuc_te_id INTEGER NOT NULL,
        loai_su_kien TEXT NOT NULL,
        reference_id INTEGER,
        ngay_thuc_hien DATETIME DEFAULT CURRENT_TIMESTAMP,
        nguoi_thuc_hien_id INTEGER,
        ghi_chu TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trang_bi_thuc_te_id) REFERENCES trang_bi_thuc_te(id) ON DELETE CASCADE,
        FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- ==========================================
    -- 7. TRIGGERS: TỰ ĐỘNG CẬP NHẬT UPDATED_AT
    -- ==========================================
    -- Bảng đơn trị (khóa chính là id)
    CREATE TRIGGER IF NOT EXISTS trg_don_vi_updated_at AFTER UPDATE ON don_vi FOR EACH ROW BEGIN UPDATE don_vi SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_users_updated_at AFTER UPDATE ON users FOR EACH ROW BEGIN UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_nhat_ky_updated_at AFTER UPDATE ON nhat_ky_he_thong FOR EACH ROW BEGIN UPDATE nhat_ky_he_thong SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_danh_muc_updated_at AFTER UPDATE ON danh_muc FOR EACH ROW BEGIN UPDATE danh_muc SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_loai_cv_updated_at AFTER UPDATE ON loai_cong_viec FOR EACH ROW BEGIN UPDATE loai_cong_viec SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_thong_tin_sp_updated_at AFTER UPDATE ON thong_tin_san_pham FOR EACH ROW BEGIN UPDATE thong_tin_san_pham SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_kho_updated_at AFTER UPDATE ON kho FOR EACH ROW BEGIN UPDATE kho SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_trang_bi_tt_updated_at AFTER UPDATE ON trang_bi_thuc_te FOR EACH ROW BEGIN UPDATE trang_bi_thuc_te SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_phieu_kho_updated_at AFTER UPDATE ON phieu_kho FOR EACH ROW BEGIN UPDATE phieu_kho SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_ct_phieu_kho_updated_at AFTER UPDATE ON chi_tiet_phieu_kho FOR EACH ROW BEGIN UPDATE chi_tiet_phieu_kho SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_phieu_bg_updated_at AFTER UPDATE ON phieu_ban_giao FOR EACH ROW BEGIN UPDATE phieu_ban_giao SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_ct_bg_updated_at AFTER UPDATE ON chi_tiet_ban_giao FOR EACH ROW BEGIN UPDATE chi_tiet_ban_giao SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_phieu_mt_updated_at AFTER UPDATE ON phieu_muon_tra FOR EACH ROW BEGIN UPDATE phieu_muon_tra SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_ct_mt_updated_at AFTER UPDATE ON chi_tiet_muon_tra FOR EACH ROW BEGIN UPDATE chi_tiet_muon_tra SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_phieu_bd_updated_at AFTER UPDATE ON phieu_bao_duong FOR EACH ROW BEGIN UPDATE phieu_bao_duong SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_ct_bd_updated_at AFTER UPDATE ON chi_tiet_bao_duong FOR EACH ROW BEGIN UPDATE chi_tiet_bao_duong SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS trg_lich_su_sp_updated_at AFTER UPDATE ON lich_su_san_pham FOR EACH ROW BEGIN UPDATE lich_su_san_pham SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

    -- Bảng có khóa chính kép (ton_kho)
    CREATE TRIGGER IF NOT EXISTS trg_ton_kho_updated_at AFTER UPDATE ON ton_kho FOR EACH ROW BEGIN 
        UPDATE ton_kho SET updated_at = CURRENT_TIMESTAMP WHERE kho_id = NEW.kho_id AND thong_tin_sp_id = NEW.thong_tin_sp_id; 
    END;
`);

module.exports = db;
