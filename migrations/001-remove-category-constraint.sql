-- Migration: Remove CHECK constraint from category field in products table
-- This allows OCR to detect any category, not just the hardcoded ones

-- Step 1: Create new products table without CHECK constraint
CREATE TABLE products_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  product_name TEXT,
  sku TEXT,
  current_price REAL,
  original_price REAL,
  discount_percent REAL,
  shelf_info_json TEXT,
  ocr_confidence_score REAL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'posted')),
  starred INTEGER DEFAULT 0,
  capture_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id)
);

-- Step 2: Copy all data from old table to new table
INSERT INTO products_new (
  id,
  trip_id,
  image_url,
  thumbnail_url,
  category,
  product_name,
  sku,
  current_price,
  original_price,
  discount_percent,
  shelf_info_json,
  ocr_confidence_score,
  status,
  starred,
  capture_timestamp
)
SELECT
  id,
  trip_id,
  image_url,
  thumbnail_url,
  category,
  product_name,
  sku,
  current_price,
  original_price,
  discount_percent,
  shelf_info_json,
  ocr_confidence_score,
  status,
  starred,
  capture_timestamp
FROM products;

-- Step 3: Drop old table
DROP TABLE products;

-- Step 4: Rename new table to products
ALTER TABLE products_new RENAME TO products;

-- Step 5: Verify migration
SELECT COUNT(*) as total_products FROM products;
