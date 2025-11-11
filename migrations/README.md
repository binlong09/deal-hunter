# Database Migrations

## Quick Fix: Remove Category Constraint Error

If you're getting this error:
```
SQLITE_CONSTRAINT: CHECK constraint failed: category IN ('supplements', 'baby', 'cosmetics')
```

This is because the database schema has a CHECK constraint limiting categories to only 3 values, but OCR now detects many more categories.

### Option 1: Run Migration Script (Recommended)

```bash
./scripts/run-migration.sh
```

Follow the prompts:
1. Enter your database name (e.g., `deal-hunter`)
2. Select migration `1`
3. Confirm with `yes`

### Option 2: Manual Migration

```bash
# Connect to your Turso database
turso db shell deal-hunter

# Run the migration SQL
.read migrations/001-remove-category-constraint.sql

# Verify
SELECT COUNT(*) FROM products;
```

### Option 3: Copy-Paste SQL

If the above don't work, copy and paste this SQL into your Turso shell:

```sql
-- Create new products table without category constraint
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
  notes TEXT,
  capture_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id)
);

-- Copy data
INSERT INTO products_new SELECT * FROM products;

-- Drop old table
DROP TABLE products;

-- Rename new table
ALTER TABLE products_new RENAME TO products;

-- Verify
SELECT COUNT(*) FROM products;
```

### After Migration

Your app will now accept any category value from OCR:
- supplements
- baby
- cosmetics
- food
- household
- personal_care
- electronics
- other

The category field is now a simple TEXT field with no constraints!

### Rollback (if needed)

If something goes wrong, you can restore from Turso's automatic backups:

```bash
# List backups
turso db shell deal-hunter ".backup list"

# Restore from a backup
turso db shell deal-hunter ".backup restore <timestamp>"
```
