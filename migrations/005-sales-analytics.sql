-- Migration: Add sales analytics and recommendation tables
-- For syncing Google Sheets sales data and generating product recommendations

-- Table: batches
-- Represents shipping batches (maps to Google Sheet tabs like "Đợt hàng 11 - 1125")
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_name TEXT NOT NULL UNIQUE,
  batch_number INTEGER, -- extracted batch number (e.g., 11)
  batch_date TEXT, -- extracted date portion (e.g., "1125" for Nov 25)
  exchange_rate REAL DEFAULT 25000, -- USD to VND rate used for this batch
  total_items INTEGER DEFAULT 0,
  total_revenue_vnd REAL DEFAULT 0,
  total_profit_vnd REAL DEFAULT 0,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: normalized_products
-- Deduplicated product catalog with AI-normalized names and categories
CREATE TABLE IF NOT EXISTS normalized_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, -- AI-normalized English name
  name_normalized TEXT NOT NULL, -- lowercase, trimmed for matching
  category TEXT NOT NULL CHECK (category IN (
    'supplements', 'skincare', 'cosmetics', 'fragrance',
    'baby', 'food', 'bags', 'clothing', 'shoes',
    'electronics', 'household', 'other'
  )),
  brand TEXT, -- extracted brand name
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_sales INTEGER DEFAULT 0, -- denormalized for quick access
  total_revenue_vnd REAL DEFAULT 0, -- denormalized for quick access
  total_profit_vnd REAL DEFAULT 0, -- denormalized for quick access
  last_sold_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: sales
-- Individual sale records from Google Sheets
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  row_number INTEGER NOT NULL, -- row in the original sheet (for updates)
  customer_name TEXT,
  product_name_raw TEXT NOT NULL, -- original Vietnamese free-text
  product_id INTEGER, -- FK to normalized_products (populated after normalization)
  cost_usd REAL,
  cost_vnd REAL,
  shipping_cost_vnd REAL,
  weight_kg REAL,
  sale_price_vnd REAL,
  profit_vnd REAL,
  payment_status TEXT CHECK (payment_status IN ('paid', 'unpaid', 'deposit', 'unknown')),
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES normalized_products(id) ON DELETE SET NULL,
  UNIQUE(batch_id, row_number)
);

-- Table: posted_items
-- Tracks items posted to Facebook for sell-through analysis
CREATE TABLE IF NOT EXISTS posted_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER, -- FK to normalized_products (optional)
  generated_post_id INTEGER, -- FK to generated_posts (optional)
  product_name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  source_store TEXT, -- costco, sams
  posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cost_usd REAL,
  listed_price_vnd REAL,
  sold INTEGER DEFAULT 0, -- boolean
  matched_sale_id INTEGER, -- FK to sales (populated when matched)
  matched_at DATETIME,
  FOREIGN KEY (product_id) REFERENCES normalized_products(id) ON DELETE SET NULL,
  FOREIGN KEY (generated_post_id) REFERENCES generated_posts(id) ON DELETE SET NULL,
  FOREIGN KEY (matched_sale_id) REFERENCES sales(id) ON DELETE SET NULL
);

-- Table: recommendations
-- Cached recommendation scores for products/categories
CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER, -- FK to normalized_products (null for category recommendations)
  category TEXT,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('post_today', 'hot_category', 'avoid')),
  score REAL NOT NULL, -- 0-100
  factors TEXT, -- JSON with breakdown: { sellThrough: 80, margin: 75, recency: 60 }
  reason TEXT, -- Human-readable explanation
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME,
  FOREIGN KEY (product_id) REFERENCES normalized_products(id) ON DELETE CASCADE
);

-- Table: product_name_cache
-- Cache for AI-normalized product names to avoid re-processing
CREATE TABLE IF NOT EXISTS product_name_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_name TEXT NOT NULL UNIQUE, -- original Vietnamese product name
  normalized_name TEXT NOT NULL, -- AI-normalized English name
  category TEXT NOT NULL,
  brand TEXT,
  product_id INTEGER, -- FK to normalized_products
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES normalized_products(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batches_sheet_name ON batches(sheet_name);
CREATE INDEX IF NOT EXISTS idx_normalized_products_name ON normalized_products(name_normalized);
CREATE INDEX IF NOT EXISTS idx_normalized_products_category ON normalized_products(category);
CREATE INDEX IF NOT EXISTS idx_normalized_products_brand ON normalized_products(brand);
CREATE INDEX IF NOT EXISTS idx_sales_batch ON sales(batch_id);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_synced ON sales(synced_at);
CREATE INDEX IF NOT EXISTS idx_posted_items_product ON posted_items(product_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_posted ON posted_items(posted_at);
CREATE INDEX IF NOT EXISTS idx_posted_items_sold ON posted_items(sold);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_valid ON recommendations(valid_until);
CREATE INDEX IF NOT EXISTS idx_product_name_cache_raw ON product_name_cache(raw_name);
