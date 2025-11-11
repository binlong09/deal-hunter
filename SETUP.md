# Deal Hunter PWA - Setup Guide

## Prerequisites
- Node.js 18+ installed
- Turso CLI installed
- Vercel account (free tier)
- Anthropic API key

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Set up Turso Database

### Install Turso CLI
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### Create Database
```bash
# Create the database
turso db create deal-hunter

# Get database URL
turso db show deal-hunter --url

# Create auth token
turso db tokens create deal-hunter
```

### Apply Schema
```bash
turso db shell deal-hunter < schema.sql
```

### Verify Tables
```bash
turso db shell deal-hunter
# Then run: .tables
# You should see: trips, products, example_posts, generated_posts, post_performance
```

## Step 3: Configure Environment Variables

Copy the example file and fill in your values:
```bash
cp .env.example .env.local
```

Update `.env.local` with:
- `TURSO_DATABASE_URL`: From `turso db show deal-hunter --url`
- `TURSO_AUTH_TOKEN`: From `turso db tokens create deal-hunter`
- `ANTHROPIC_API_KEY`: From https://console.anthropic.com/settings/keys
- `BLOB_READ_WRITE_TOKEN`: Will be set automatically by Vercel (leave as-is for now)

## Step 4: Install Vercel CLI (for deployment)
```bash
npm i -g vercel
```

## Step 5: Run Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Step 6: Test on Mobile (Optional)

To test on your iPhone/Android on the same WiFi:

1. Get your local IP:
   - Mac: `ipconfig getifaddr en0`
   - Windows: `ipconfig` (look for IPv4)
   - Linux: `hostname -I`

2. Open `http://YOUR_IP:3000` on your phone

## Step 7: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Go to: Project Settings > Environment Variables
# Add: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, ANTHROPIC_API_KEY
```

### Enable Vercel Blob Storage

1. Go to Vercel dashboard
2. Select your project
3. Go to **Storage** tab
4. Click **Create Database** > **Blob**
5. The `BLOB_READ_WRITE_TOKEN` will be automatically added to your environment variables

## Database Seed (Optional)

You can add some example posts to help with AI generation:

```bash
turso db shell deal-hunter
```

```sql
INSERT INTO example_posts (product_category, product_type, post_text, emoji_density) VALUES
('supplements', 'vitamins', '🔥 FLASH DEAL - Nature Made Vitamin D3 💊

Hàng chính hãng từ Costco US 🇺🇸
Giá gốc: $25.99
Giá sale: $18.99 💰
Tiết kiệm: 27% 📉

✅ 400 viên - dùng cả năm
✅ 2000 IU - liều lượng chuẩn FDA
✅ Authentic từ Mỹ, ship 2-3 tuần

Comment "ĐẶT" để order ngay! 🛒

#vitamind #supplements #costcodeal #dealhunter #hangmy', 0.15);
```

## Troubleshooting

### "TURSO_DATABASE_URL is not set"
Make sure `.env.local` exists and has valid values. Restart the dev server after making changes.

### Camera not working
- HTTPS is required for camera access (works on localhost for testing)
- Check browser permissions
- On iOS, the user must grant camera permission

### Images not uploading
- Vercel Blob must be enabled in your project
- Check that `BLOB_READ_WRITE_TOKEN` is set (auto-set by Vercel)

## Next Steps

1. Test the capture flow
2. Add your own example posts
3. Customize the AI prompt in `lib/claude.ts`
4. Add your Facebook group posting workflow
5. Track performance metrics

## Architecture Overview

```
User captures photo → Upload to Vercel Blob → Save to Turso
                                                      ↓
Wife curates products ← Display from Turso ← Filter & approve
                                                      ↓
AI generates posts ← Fetch examples ← Claude API
                                                      ↓
Copy & share ← Schedule posts ← Download optimized image
```

## Costs

- **Turso**: Free (500 DBs, 1GB storage, unlimited reads)
- **Vercel**: Free (125k function invocations/month, 100GB bandwidth)
- **Vercel Blob**: Free (1GB storage, then $0.15/GB)
- **Claude API**: ~$2-3/month for ~1000 posts

**Total: ~$2-3/month** (mostly Claude API usage)
