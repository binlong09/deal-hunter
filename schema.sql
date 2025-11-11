-- Shopping trips
CREATE TABLE trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  store TEXT NOT NULL CHECK(store IN ('costco', 'sams')),
  total_items INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'capturing' CHECK(status IN ('capturing', 'uploaded', 'curated')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product captures
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER REFERENCES trips(id),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  product_name TEXT,
  sku TEXT,
  current_price REAL,
  original_price REAL,
  discount_percent INTEGER,
  category TEXT CHECK(category IN ('supplements', 'baby', 'cosmetics')),
  shelf_info_json TEXT, -- JSON stored as text
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'posted')),
  starred INTEGER DEFAULT 0, -- SQLite uses INTEGER for boolean
  capture_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  ocr_confidence_score REAL
);

CREATE INDEX idx_products_trip_id ON products(trip_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);

-- Example posts for AI training
CREATE TABLE example_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_category TEXT,
  product_type TEXT,
  post_text TEXT NOT NULL,
  style_notes TEXT,
  emoji_density REAL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generated posts
CREATE TABLE generated_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER REFERENCES products(id),
  scheduled_date DATE,
  scheduled_time TIME,
  post_text TEXT NOT NULL,
  optimized_image_url TEXT,
  status TEXT DEFAULT 'generated' CHECK(status IN ('generated', 'copied', 'downloaded', 'posted')),
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  posted_at DATETIME,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0
);

CREATE INDEX idx_generated_posts_product_id ON generated_posts(product_id);
CREATE INDEX idx_generated_posts_status ON generated_posts(status);
CREATE INDEX idx_generated_posts_scheduled ON generated_posts(scheduled_date, scheduled_time);

-- Post performance tracking
CREATE TABLE post_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generated_post_id INTEGER REFERENCES generated_posts(id),
  engagement_score REAL,
  conversion_rate REAL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
