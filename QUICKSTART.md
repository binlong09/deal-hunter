# Quick Start Guide

Get your Deal Hunter PWA up and running in 10 minutes!

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

## Step 2: Set Up Turso Database (3 mins)

### Install Turso CLI

```bash
# Mac/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (use WSL or download from turso.tech)
```

### Create and Initialize Database

```bash
# Create database
turso db create deal-hunter

# Get database URL
turso db show deal-hunter --url
# Copy this URL - you'll need it for .env.local

# Create auth token
turso db tokens create deal-hunter
# Copy this token - you'll need it for .env.local

# Apply schema
turso db shell deal-hunter < schema.sql

# Verify tables were created
turso db shell deal-hunter
> .tables
# You should see: trips, products, example_posts, generated_posts, post_performance
> .quit
```

## Step 3: Configure Environment (2 mins)

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and update:
   ```env
   TURSO_DATABASE_URL=libsql://[your-db-url]
   TURSO_AUTH_TOKEN=eyJ[your-token]
   ANTHROPIC_API_KEY=sk-ant-[your-key]
   ```

   Get your Anthropic API key from: https://console.anthropic.com/settings/keys

## Step 4: Run Development Server (1 min)

```bash
npm run dev
```

Open http://localhost:3000 in your browser!

## Step 5: Test the App (3 mins)

### Test on Desktop

1. **Home Page**: You should see 4 buttons
2. **Capture Page**: Click "Capture Products"
   - Select a category
   - Click "Start Camera"
   - Allow camera access
   - Tap to capture (works with webcam)

3. **Dashboard**: Go back and click "Curate Deals"
   - You should see your captured photos
   - Click to select, approve, or star products

4. **Generate Posts**: Click "Generate Posts"
   - Select products
   - Click "Generate Posts"
   - AI will create Facebook posts!

5. **Manage Examples**: Click "Manage Examples"
   - Add example posts to train the AI

### Test on Mobile (Optional)

1. Get your local IP:
   ```bash
   # Mac
   ipconfig getifaddr en0

   # Linux
   hostname -I | awk '{print $1}'
   ```

2. On your phone, open: `http://YOUR_IP:3000`

3. Test camera capture (works better on mobile!)

## Seed Example Post (Optional)

To help the AI generate better posts, add an example:

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

Exit with `.quit`

## Common Issues

### "TURSO_DATABASE_URL is not set"
- Make sure `.env.local` exists
- Restart the dev server: `Ctrl+C` then `npm run dev`

### Camera not working
- Allow camera permissions in browser
- HTTPS required (localhost works for dev)
- Try a different browser

### AI generation fails
- Verify `ANTHROPIC_API_KEY` is correct
- Check you have API credits
- Make sure you added at least one example post

## Next Steps

1. **Deploy to Vercel** (see SETUP.md)
2. **Enable Vercel Blob** for image storage
3. **Add more example posts** for better AI results
4. **Customize AI prompt** in `lib/claude.ts`
5. **Add Sharp** for image optimization

## What Works Without Vercel Blob?

Most features work locally without Blob storage:
- Camera capture (saves to local state)
- Product curation
- Dashboard filtering
- Example post management

To upload images, you'll need Vercel Blob (free on Vercel) or you can modify `lib/blob.ts` to use a different storage solution.

## Architecture Overview

```
Phone → Camera → Upload → Vercel Blob → URL saved in Turso
                                              ↓
Desktop → Dashboard → Approve Products → Generate AI Posts
                                              ↓
                                    Claude API → Facebook
```

## Support

- Check SETUP.md for detailed setup
- Check README.md for full documentation
- Review troubleshooting sections

Happy deal hunting! 🎯💰
