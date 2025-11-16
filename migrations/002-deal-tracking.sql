-- Migration: Add deal tracking and price monitoring tables

-- Table: tracked_products
-- Stores products that users want to monitor for price changes
CREATE TABLE IF NOT EXISTS tracked_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  product_name TEXT,
  current_price REAL,
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  store_name TEXT,
  priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3)), -- 1=high, 2=medium, 3=low
  check_frequency INTEGER DEFAULT 1440, -- minutes (1440 = daily)
  last_checked_at DATETIME,
  last_price_change_at DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: price_history
-- Tracks historical prices for each product
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracked_product_id INTEGER NOT NULL,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  in_stock INTEGER DEFAULT 1,
  sale_badge TEXT, -- "Black Friday", "Cyber Monday", "Limited Time", etc.
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tracked_product_id) REFERENCES tracked_products(id) ON DELETE CASCADE
);

-- Table: deal_alerts
-- Stores generated deal alerts/notifications
CREATE TABLE IF NOT EXISTS deal_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracked_product_id INTEGER NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_drop', 'back_in_stock', 'new_sale', 'deal_score')),
  old_price REAL,
  new_price REAL,
  discount_percent REAL,
  deal_score REAL, -- 0-100 score from AI
  deal_quality TEXT, -- 'good', 'great', 'amazing'
  message TEXT,
  is_read INTEGER DEFAULT 0,
  is_notified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tracked_product_id) REFERENCES tracked_products(id) ON DELETE CASCADE
);

-- Table: tracking_settings
-- User preferences for deal tracking
CREATE TABLE IF NOT EXISTS tracking_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT DEFAULT 'default',
  notify_on_any_drop INTEGER DEFAULT 0, -- notify on any price drop
  notify_on_percent_drop REAL DEFAULT 10.0, -- notify if drop >= this %
  notify_on_deal_score REAL DEFAULT 70.0, -- notify if deal score >= this
  notify_on_back_in_stock INTEGER DEFAULT 1,
  preferred_stores TEXT, -- JSON array of preferred stores
  max_price_alerts_per_day INTEGER DEFAULT 10,
  quiet_hours_start TEXT, -- "22:00"
  quiet_hours_end TEXT, -- "08:00"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO tracking_settings (user_id) VALUES ('default');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracked_products_active ON tracked_products(is_active, last_checked_at);
CREATE INDEX IF NOT EXISTS idx_tracked_products_priority ON tracked_products(priority, is_active);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(tracked_product_id, checked_at);
CREATE INDEX IF NOT EXISTS idx_deal_alerts_unread ON deal_alerts(is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_deal_alerts_product ON deal_alerts(tracked_product_id, created_at);
