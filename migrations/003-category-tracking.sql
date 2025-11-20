-- Migration: Add category-based tracking
-- Allows tracking of product categories instead of specific URLs
-- Example: "any air fryer under $50"

-- Table: category_trackers
-- Stores category-based tracking rules
CREATE TABLE IF NOT EXISTS category_trackers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, -- "Air Fryers Under $50"
  description TEXT, -- Optional description
  search_keywords TEXT NOT NULL, -- "air fryer, airfryer, air-fryer"
  max_price REAL, -- Maximum price threshold
  min_price REAL, -- Minimum price threshold (optional)
  min_discount_percent REAL, -- Only notify if discount >= this %
  category TEXT, -- "Electronics", "Home", "Kitchen", etc.
  store_filter TEXT, -- JSON array of preferred stores ["Amazon", "Target"]
  is_active INTEGER DEFAULT 1,
  check_frequency INTEGER DEFAULT 720, -- minutes (12 hours)
  last_checked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: category_matches
-- Stores products that match category trackers
CREATE TABLE IF NOT EXISTS category_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_tracker_id INTEGER NOT NULL,
  product_url TEXT NOT NULL,
  product_name TEXT,
  current_price REAL,
  original_price REAL, -- Price when first matched
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  store_name TEXT,
  discount_percent REAL,
  match_score REAL, -- 0-100, how well it matches the category
  is_available INTEGER DEFAULT 1,
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_tracker_id) REFERENCES category_trackers(id) ON DELETE CASCADE,
  UNIQUE(category_tracker_id, product_url)
);

-- Table: category_alerts
-- Alerts when new products match a category or prices drop
CREATE TABLE IF NOT EXISTS category_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_tracker_id INTEGER NOT NULL,
  category_match_id INTEGER NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('new_match', 'price_drop', 'back_in_stock')),
  product_name TEXT,
  product_url TEXT,
  current_price REAL,
  previous_price REAL,
  discount_percent REAL,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_tracker_id) REFERENCES category_trackers(id) ON DELETE CASCADE,
  FOREIGN KEY (category_match_id) REFERENCES category_matches(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_trackers_active ON category_trackers(is_active, last_checked_at);
CREATE INDEX IF NOT EXISTS idx_category_matches_tracker ON category_matches(category_tracker_id, is_available);
CREATE INDEX IF NOT EXISTS idx_category_matches_price ON category_matches(current_price);
CREATE INDEX IF NOT EXISTS idx_category_alerts_unread ON category_alerts(is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_category_alerts_tracker ON category_alerts(category_tracker_id, created_at);
