# Deploy Deal Hunter PWA to Vercel

This guide walks you through deploying your Deal Hunter PWA to Vercel from start to finish.

## Prerequisites

Before you begin, make sure you have:
- A [Vercel account](https://vercel.com/signup) (free tier works)
- A [Turso account](https://turso.tech/) (free tier works)
- An [Anthropic API key](https://console.anthropic.com/settings/keys)
- Your code pushed to GitHub, GitLab, or Bitbucket

---

## Step 1: Set Up Turso Database

### 1.1 Install Turso CLI (if not already installed)
```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Or using Homebrew
brew install tursodatabase/tap/turso
```

### 1.2 Login to Turso
```bash
turso auth login
```

### 1.3 Create Your Database
```bash
# Create the database
turso db create deal-hunter

# Get the database URL
turso db show deal-hunter --url

# Create an auth token
turso db tokens create deal-hunter
```

**Save these values** - you'll need them for Vercel:
- `TURSO_DATABASE_URL`: The URL from the show command (starts with `libsql://`)
- `TURSO_AUTH_TOKEN`: The token from the tokens create command

### 1.4 Initialize Database Schema

The database schema will be automatically created when you first run the app, but you can verify it works:

```bash
# Connect to your database
turso db shell deal-hunter

# Check if tables exist (after first deployment)
.tables
```

---

## Step 2: Get Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Sign in or create an account
3. Click **"Create Key"**
4. Give it a name like "Deal Hunter Production"
5. Copy the API key (starts with `sk-ant-`)

**Important**: Save this key securely - you won't be able to see it again!

---

## Step 3: Deploy to Vercel

### 3.1 Push Your Code to Git

```bash
# If you haven't already, initialize git and push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 3.2 Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Vercel will auto-detect Next.js - keep the default settings
5. **Don't click Deploy yet!** First, add environment variables...

### 3.3 Add Environment Variables

In the Vercel project setup, expand **"Environment Variables"** and add:

| Name | Value | Notes |
|------|-------|-------|
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` | From Step 1.3 |
| `TURSO_AUTH_TOKEN` | `eyJ...` | From Step 1.3 |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | From Step 2 |
| `NEXT_PUBLIC_APP_URL` | Leave empty for now | We'll add this after first deploy |

**Important**: Make sure to select **Production**, **Preview**, and **Development** for all variables.

### 3.4 Deploy!

Click **"Deploy"** and wait for the build to complete (usually 2-3 minutes).

---

## Step 4: Set Up Vercel Blob Storage

After your first deployment:

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on the **"Storage"** tab
3. Click **"Create Database"** → **"Blob"**
4. Give it a name like "deal-hunter-images"
5. Click **"Create"**
6. Vercel will automatically add `BLOB_READ_WRITE_TOKEN` to your environment variables

**No redeploy needed** - the token is available immediately!

---

## Step 5: Update App URL

1. Copy your Vercel deployment URL (e.g., `https://deal-hunter-pwa.vercel.app`)
2. Go to **Settings** → **Environment Variables** in Vercel
3. Add/Update:
   - `NEXT_PUBLIC_APP_URL`: Your full Vercel URL

4. **Redeploy** to apply the change:
   - Go to **Deployments** tab
   - Click the **⋮** menu on the latest deployment
   - Click **"Redeploy"**

---

## Step 6: Test Your Deployment

### 6.1 Basic Functionality Test

Visit your deployed app and test:

1. **Home page loads** - Should see the Deal Hunter landing page
2. **Start a trip** - Go to `/capture`
3. **Take a photo** - Test camera capture
4. **Upload succeeds** - Photo should upload to Vercel Blob
5. **View dashboard** - Check `/dashboard` shows the product
6. **Generate a post** - AI should generate post text
7. **View generated post** - Check `/generate` shows the post

### 6.2 Check for Errors

Open browser DevTools (F12) and check:
- **Console**: Should have no red errors
- **Network**: API calls should return 200 status

### 6.3 Verify Database

```bash
# Connect to your Turso database
turso db shell deal-hunter

# Check if data was created
SELECT COUNT(*) FROM trips;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM generated_posts;
```

---

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Check that all 3 required env vars are set in Vercel
- Make sure they're available for Production, Preview, and Development

**Error: Module not found**
- Run `npm install` locally and push the updated `package-lock.json`

### Runtime Errors

**"Failed to connect to database"**
- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are correct
- Check token hasn't expired: `turso db tokens create deal-hunter` (create a new one)

**"ANTHROPIC_API_KEY is not set"**
- Verify the API key is set in Vercel environment variables
- Check you didn't accidentally include quotes around the value

**"Failed to upload image"**
- Make sure Vercel Blob storage is created
- Check `BLOB_READ_WRITE_TOKEN` exists in environment variables
- Redeploy after adding Blob storage

**OCR not working / Products have no info**
- Check Anthropic API key is valid
- Verify you have credits in your Anthropic account
- Check browser console for API errors

---

## Production Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] Vercel Blob storage created and working
- [ ] Turso database accessible and schema initialized
- [ ] Test image upload end-to-end
- [ ] Test OCR extraction with real product photos
- [ ] Add example posts in `/admin/examples` to train the AI
- [ ] Test post generation with your writing style
- [ ] Verify mobile PWA installation works
- [ ] Test camera on mobile device
- [ ] Set up custom domain (optional) in Vercel

---

## Updating After Deployment

To deploy updates:

```bash
# Make your changes
git add .
git commit -m "Description of changes"
git push origin main
```

Vercel will **automatically deploy** when you push to your main branch!

---

## Custom Domain (Optional)

To use your own domain:

1. Go to **Settings** → **Domains** in Vercel
2. Add your domain
3. Update your DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain
5. Redeploy

---

## Cost Estimate

This setup uses free tiers:

- **Vercel**: Free tier (100GB bandwidth, unlimited deployments)
- **Turso**: Free tier (500MB storage, 1B row reads/month)
- **Vercel Blob**: Free tier included with Vercel
- **Anthropic API**: Pay-per-use (~$0.003 per request for Claude Sonnet)

**Estimated monthly cost**: $0-5 depending on usage

---

## Support

If you encounter issues:

1. Check Vercel deployment logs: **Deployments** → Click on deployment → **Build Logs**
2. Check runtime logs: **Deployments** → Click deployment → **Functions** → Select a function
3. Verify environment variables: **Settings** → **Environment Variables**

---

## Next Steps

After successful deployment:

1. **Add example posts** at `/admin/examples` to train the AI with your writing style
2. **Test the full workflow** with real product photos
3. **Share the app** with your team
4. **Install as PWA** on mobile devices for the best experience

Your Deal Hunter PWA is now live! 🎉
