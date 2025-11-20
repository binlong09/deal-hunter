-- Migration: Add deal authenticity tracking fields

-- Add authenticity fields to tracked_products
ALTER TABLE tracked_products ADD COLUMN authenticity_score INTEGER; -- 0-100
ALTER TABLE tracked_products ADD COLUMN authenticity_verdict TEXT; -- GENUINE, LIKELY_GENUINE, SUSPICIOUS, LIKELY_FAKE, UNKNOWN
ALTER TABLE tracked_products ADD COLUMN authenticity_reasoning TEXT;
ALTER TABLE tracked_products ADD COLUMN authenticity_checked_at DATETIME;
ALTER TABLE tracked_products ADD COLUMN claimed_original_price REAL; -- Store the "was $X" price if available

-- Add index for querying suspicious deals
CREATE INDEX IF NOT EXISTS idx_tracked_products_authenticity ON tracked_products(authenticity_verdict, authenticity_score);
