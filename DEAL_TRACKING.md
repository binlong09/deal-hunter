# Deal Tracking Feature

An intelligent price monitoring and deal scoring system for Black Friday and everyday deal hunting.

## Overview

Track product prices from any website, get AI-powered deal scoring, and receive alerts when great deals happen.

### Key Features

- 🔍 **Track Any Product**: Add product URLs from Amazon, Target, Walmart, Costco, and more
- 💰 **Smart Price Extraction**: Automatically extracts prices from HTML (no API keys needed for most sites)
- 🤖 **AI Deal Scoring**: Uses Claude Haiku 3.5 to evaluate deal quality (score 0-100)
- 📊 **Price History**: Track price changes over time
- 🔔 **Deal Alerts**: Get notified when prices drop significantly
- ⚡ **Priority Levels**: High priority products check every 3 hours, low priority daily
- 💵 **Cost-Effective**: ~$5-10/month for 50 products with smart scheduling

## How It Works

### 1. Add Products to Track

```
1. Go to /deals page
2. Paste product URL
3. Choose priority level:
   - High (🔴): Checks every 3 hours - for Black Friday hot deals
   - Medium (🟡): Checks every 12 hours - for regular monitoring
   - Low (⚪): Checks daily - for patient deal hunters
4. Click "Track This Product"
```

### 2. Automatic Price Checking

The system uses a **3-tier approach** to minimize costs:

**Tier 1: HTML Parsing (Free)**
- Extracts price directly from product page HTML
- Works for 80-90% of sites
- No AI needed, instant extraction
- Cost: $0

**Tier 2: Deal Scoring with Haiku 3.5 ($0.008 per score)**
- Only runs when price drops
- Evaluates discount percentage, price history, sale badges
- Returns deal score (0-100) and quality rating
- Cost: ~$1-3/month for 50 products

**Tier 3: Fallback to Sonnet 4 ($0.03)**
- Only when HTML parsing fails
- Handles complex page layouts
- Rare, maybe 5-10% of checks
- Cost: minimal

### 3. Deal Scoring

When a price drops, AI evaluates:

- **Discount Percentage**: How much cheaper is it?
- **Price History**: Is this the lowest ever?
- **Sale Badge**: Black Friday? Limited time?
- **Trend Analysis**: Is price dropping or stable?

**Scoring Scale:**
- 0-20: Poor (price increase or minimal discount)
- 21-40: Fair (small discount, not special)
- 41-60: Good (decent discount, worth considering)
- 61-80: Great (significant discount, good time to buy)
- 81-100: Amazing (historical low or exceptional discount)

**Example AI Output:**
```json
{
  "score": 85,
  "quality": "amazing",
  "reasoning": "60% off is exceptional for this brand. Price is below historical average by $25.",
  "recommendation": "Buy now - this is the best deal we've seen",
  "isPriceDropSignificant": true,
  "isHistoricalLow": true
}
```

### 4. Deal Alerts

Get notified when:
- ✅ Price drops by 10%+ (customizable)
- ✅ Deal score >= 70/100 (great deals)
- ✅ Product back in stock
- ✅ New sale badge detected

## Setup Instructions

### 1. Run Database Migration

```bash
cd /Users/nghiadang/AIProjects/dealHunterPWA

# Option 1: Use the migration script
./scripts/run-migration.sh

# When prompted, select migration:
# 2 (for 002-deal-tracking.sql)

# Option 2: Manual via Turso CLI
turso db shell deal-hunter < migrations/002-deal-tracking.sql
```

### 2. Configure Settings (Optional)

Default settings work great, but you can customize in the database:

```sql
UPDATE tracking_settings SET
  notify_on_percent_drop = 15.0,        -- Alert if price drops 15%+
  notify_on_deal_score = 75.0,          -- Alert if deal score >= 75
  notify_on_back_in_stock = 1,          -- Alert when product restocked
  max_price_alerts_per_day = 10;        -- Limit notifications
```

### 3. Set Up Automated Price Checking

**Option A: Vercel Cron (Recommended for production)**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/check-prices",
      "schedule": "0 */3 * * *"
    }
  ]
}
```

This checks prices every 3 hours automatically.

**Option B: Manual Trigger**

Visit `/deals` page and click "🔄 Check Prices" button.

**Option C: External Cron (Alternative)**

Use a service like cron-job.org to hit:
```
https://your-domain.vercel.app/api/check-prices
```

## Usage Examples

### Black Friday Monitoring

```
Priority: High (check every 3h)
Products to track:
- TV deals on Amazon
- Laptop deals on Best Buy
- Air fryer on Target

Result: You'll know within 3 hours when a great deal appears
```

### Everyday Deal Hunting

```
Priority: Medium/Low (check daily)
Products to track:
- Vitamins on Costco
- Diapers on Amazon
- Protein powder on iHerb

Result: Patient deal hunting, notify when prices hit sweet spot
```

### Price Drop Waiting

```
Add product, set Low priority
System tracks price for weeks/months
When price drops 20%+, AI scores it as "great" deal
You get alert to buy
```

## Cost Estimates

### Conservative Monitoring (50 products)

**Black Friday Week:**
- HTML parsing: Free
- AI scoring (20% price changes): 140 products × $0.008 = $1.12
- Fallback to Sonnet (5%): 35 × $0.03 = $1.05
- **Total: ~$2-3 for the week**

**Normal Month:**
- HTML parsing: Free
- AI scoring: 150 × $0.008 = $1.20
- Fallback: 75 × $0.03 = $2.25
- **Total: ~$3-5 per month**

### Heavy Monitoring (100 products, frequent checks)

**Black Friday:** $5-10
**Normal Month:** $8-15

## API Endpoints

### Tracked Products
- `GET /api/tracked-products` - List all tracked products
- `POST /api/tracked-products` - Add new product
- `PUT /api/tracked-products?id=123` - Update product settings
- `DELETE /api/tracked-products?id=123` - Stop tracking

### Price Checking
- `POST /api/check-prices` - Check all active products
- `GET /api/check-prices` - Same as POST (for cron services)

### Deal Alerts
- `GET /api/deal-alerts?limit=20` - Get recent alerts
- `PUT /api/deal-alerts?id=123` - Mark alert as read
- `DELETE /api/deal-alerts?id=123` - Delete alert

## Database Schema

### tracked_products
- Product URL, current price, store info
- Priority level, check frequency
- Last checked timestamp

### price_history
- Historical prices for each product
- Stock status, sale badges
- Timestamp of each check

### deal_alerts
- Price drop notifications
- AI deal scores and quality ratings
- Read/unread status

### tracking_settings
- User preferences
- Notification thresholds
- Quiet hours (future feature)

## Supported Websites

**Tested:**
- Amazon
- Target
- Walmart
- Costco

**Should Work:**
- Best Buy
- Home Depot
- Walgreens
- CVS
- Most e-commerce sites with standard HTML structure

## Tips for Best Results

1. **Use Priority Wisely**: High priority for time-sensitive deals only
2. **Track Specific Products**: More accurate than category searches
3. **Check URL Works**: Test product page loads before adding
4. **Monitor Price History**: Look for patterns (prices drop on weekends, etc.)
5. **Set Realistic Thresholds**: 10-15% drops are worth notifications
6. **Black Friday Prep**: Add products 1-2 weeks early to establish price history

## Troubleshooting

**Price not extracting?**
- Check if product page loads correctly
- Some sites block automated access (use Sonnet fallback)
- Try a different product URL from same site

**No deal alerts?**
- Price must change for alert to trigger
- Check notification thresholds in settings
- Ensure product is active (not paused)

**Too many false positives?**
- Increase `notify_on_percent_drop` threshold
- Raise `notify_on_deal_score` threshold
- Lower priority for that product

## Future Enhancements

- 🔔 Push notifications (PWA)
- 📧 Email alerts
- 📱 SMS notifications (Twilio)
- 📈 Price prediction (ML model)
- 🏷️ Category-based tracking ("any air fryer under $50")
- 🌐 Multi-user support
- 📊 Price charts and visualizations

## Tech Stack

- **Price Extraction**: Cheerio (HTML parsing)
- **AI Scoring**: Claude Haiku 3.5 ($1/MTok input, $5/MTok output)
- **Database**: Turso (SQLite)
- **Cron**: Vercel Cron Jobs
- **Frontend**: Next.js 15, React, Tailwind CSS
