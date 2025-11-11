# 🚀 Get Started in 3 Steps

Welcome to Deal Hunter PWA! Follow these 3 simple steps to get your app running.

## Prerequisites

Before you begin, make sure you have:
- [ ] Node.js 18 or higher installed
- [ ] A terminal/command line application
- [ ] 15 minutes of time

## Step 1: Set Up the Database (5 minutes)

### Install Turso CLI

**Mac/Linux:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

**Windows:**
Download from [turso.tech](https://turso.tech) or use WSL

### Create Your Database

```bash
# 1. Create the database
turso db create deal-hunter

# 2. Apply the schema (creates all tables)
turso db shell deal-hunter < schema.sql

# 3. Verify tables were created
turso db shell deal-hunter
> .tables
# You should see: trips, products, example_posts, generated_posts, post_performance
> .quit
```

### Get Your Credentials

```bash
# Get database URL
turso db show deal-hunter --url
# Copy this! You'll need it for .env.local

# Get auth token
turso db tokens create deal-hunter
# Copy this too! You'll need it for .env.local
```

## Step 2: Configure Environment (2 minutes)

### Copy the Environment Template

```bash
cp .env.example .env.local
```

### Edit .env.local

Open `.env.local` in your text editor and update:

```env
# Paste your Turso database URL here
TURSO_DATABASE_URL=libsql://your-database-name.turso.io

# Paste your Turso auth token here
TURSO_AUTH_TOKEN=eyJhbGc...your-token-here

# Get your Claude API key from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Leave this as-is for now (will be set by Vercel later)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

# For local development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Get Anthropic API Key

1. Go to https://console.anthropic.com/settings/keys
2. Sign up (if needed) or log in
3. Click "Create Key"
4. Copy the key and paste into `.env.local`

## Step 3: Run the App (3 minutes)

### Install Dependencies

```bash
npm install
```

This will take about 1-2 minutes.

### Start Development Server

```bash
npm run dev
```

### Open in Browser

Open http://localhost:3000

You should see the Deal Hunter home page with 4 buttons!

## 🎉 You're Ready!

### Test the App

Try these features:

1. **Capture Page** (`/capture`)
   - Select a category
   - Click "Start Camera"
   - Allow camera access
   - Tap anywhere to capture photos

2. **Dashboard** (`/dashboard`)
   - View your captured products
   - Click to select products
   - Approve or star products

3. **Generate Posts** (`/generate`)
   - Select products
   - Click "Generate Posts"
   - See AI-generated Facebook posts!

4. **Manage Examples** (`/admin/examples`)
   - Add example posts to train the AI

## 🌱 Seed Example Posts (Optional)

To help the AI generate better posts, add some examples:

```bash
./scripts/seed-example.sh
```

Or manually add via the UI at http://localhost:3000/admin/examples

## 📱 Test on Mobile (Optional)

Want to test the camera on your phone?

1. Get your computer's local IP:
   ```bash
   # Mac
   ipconfig getifaddr en0

   # Linux
   hostname -I | awk '{print $1}'

   # Windows (PowerShell)
   (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"}).IPAddress
   ```

2. On your phone (must be on same WiFi):
   - Open browser
   - Go to `http://YOUR_IP:3000`
   - Test the camera!

## 🚀 Deploy to Production

When you're ready to deploy:

1. **Read DEPLOY.md** for full deployment guide
2. Quick deploy:
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

3. Add environment variables in Vercel dashboard
4. Enable Vercel Blob storage
5. Visit your production URL!

## 🆘 Troubleshooting

### "TURSO_DATABASE_URL is not set"
- Make sure `.env.local` exists in the project root
- Check that you copied the values correctly
- Restart the dev server: `Ctrl+C` then `npm run dev`

### Camera not working
- Click "Allow" when browser asks for camera permission
- Try a different browser (Chrome works best)
- HTTPS is required (localhost works for development)

### "Cannot find module" errors
- Run `npm install` again
- Delete `node_modules` and `.next` folders, then `npm install`

### Database connection error
- Verify your Turso credentials in `.env.local`
- Test connection: `turso db shell deal-hunter`
- Make sure the database exists: `turso db list`

### AI generation fails
- Check that `ANTHROPIC_API_KEY` is set correctly
- Verify you have API credits at https://console.anthropic.com
- Add at least one example post first

## 📚 Documentation

| File | What's Inside |
|------|---------------|
| `QUICKSTART.md` | Detailed 10-minute setup |
| `SETUP.md` | Complete setup instructions |
| `DEPLOY.md` | Vercel deployment guide |
| `README.md` | Full documentation |
| `PROJECT_SUMMARY.md` | Project overview |

## 💡 Next Steps

Once the app is running locally:

1. ✅ Capture some test products
2. ✅ Add example posts for AI training
3. ✅ Generate your first AI posts
4. ✅ Test on mobile device
5. ✅ Deploy to Vercel
6. ✅ Enable Blob storage
7. ✅ Install as PWA on phone
8. ✅ Start hunting deals!

## 🎯 Quick Commands Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Test production build
npm run start        # Run production build
npm run lint         # Check code quality

# Database
turso db shell deal-hunter              # Open database shell
turso db show deal-hunter               # Show database info
turso db show deal-hunter --url         # Get database URL
turso db tokens create deal-hunter      # Create auth token

# Deployment
vercel                 # Deploy to preview
vercel --prod          # Deploy to production
vercel env add         # Add environment variable
```

## 🔗 Useful Links

- **Turso Dashboard**: https://turso.tech/app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Anthropic Console**: https://console.anthropic.com
- **Next.js Docs**: https://nextjs.org/docs

## ✨ Features at a Glance

- 📸 Mobile camera capture
- 🎯 Product curation dashboard
- 🤖 AI post generation (Claude)
- 📅 Auto-scheduling
- 📱 PWA (installable)
- 💾 Turso database (never expires!)
- 🚀 Vercel hosting (free tier)
- 💰 ~$2-3/month total cost

## 🎊 Success!

If you can see the home page and click through the different sections, you've successfully set up Deal Hunter PWA!

**Questions?** Check the troubleshooting section above or read the full documentation.

**Ready to deploy?** See DEPLOY.md

**Happy deal hunting!** 🎯💰

---

Built with ❤️ using Next.js, Turso, Vercel, and Claude AI
