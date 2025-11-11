# Deployment Guide - Vercel

Deploy your Deal Hunter PWA to Vercel in under 10 minutes!

## Prerequisites

- Turso database already created (see QUICKSTART.md)
- Anthropic API key
- Vercel account (free tier is fine)

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate.

## Step 3: Deploy

```bash
# From your project directory
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? [Your account]
# - Link to existing project? No
# - What's your project's name? deal-hunter (or whatever you want)
# - In which directory is your code located? ./
# - Want to override settings? No
```

The CLI will:
1. Build your project
2. Upload to Vercel
3. Deploy to a preview URL
4. Give you a production URL

## Step 4: Add Environment Variables

### Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` | Production, Preview, Development |
   | `TURSO_AUTH_TOKEN` | `eyJ...` | Production, Preview, Development |
   | `ANTHROPIC_API_KEY` | `sk-ant-...` | Production, Preview, Development |

5. Click **Save** for each

### Via Vercel CLI (Alternative)

```bash
# Production
vercel env add TURSO_DATABASE_URL production
vercel env add TURSO_AUTH_TOKEN production
vercel env add ANTHROPIC_API_KEY production

# Preview
vercel env add TURSO_DATABASE_URL preview
vercel env add TURSO_AUTH_TOKEN preview
vercel env add ANTHROPIC_API_KEY preview
```

## Step 5: Enable Vercel Blob Storage

1. Go to your project dashboard
2. Click on **Storage** tab
3. Click **Create Database**
4. Select **Blob**
5. Choose a name (e.g., `deal-hunter-images`)
6. Click **Create**

Vercel will automatically:
- Create the Blob store
- Add `BLOB_READ_WRITE_TOKEN` to your environment variables
- Connect it to your project

## Step 6: Redeploy

After adding environment variables, redeploy:

```bash
vercel --prod
```

Or just push to your git repo if you've connected it.

## Step 7: Test Production

1. Visit your production URL: `https://your-project.vercel.app`
2. Test all features:
   - Camera capture
   - Image upload
   - Dashboard
   - AI post generation

## Step 8: Install as PWA

### On iOS (Safari)
1. Open your production URL in Safari
2. Tap the Share button (box with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. The app icon appears on your home screen!

### On Android (Chrome)
1. Open your production URL in Chrome
2. Tap the menu (3 dots)
3. Tap "Install app" or "Add to Home Screen"
4. Tap "Install"
5. The app appears in your app drawer!

## Custom Domain (Optional)

### Add Custom Domain

1. Go to **Settings** → **Domains**
2. Click **Add**
3. Enter your domain (e.g., `deals.yourdomain.com`)
4. Follow DNS instructions
5. Vercel handles SSL automatically!

### Update Environment Variable

```bash
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://your-custom-domain.com
```

## Continuous Deployment (Optional)

### Connect to GitHub

1. Push your code to GitHub
2. In Vercel dashboard, click **Settings** → **Git**
3. Click **Connect Git Repository**
4. Select your GitHub repo
5. Every push to `main` automatically deploys!

### Auto-deploy branches

- `main` → Production
- Other branches → Preview deployments
- Pull requests → Preview deployments

## Monitoring

### Vercel Analytics (Free)

1. Go to **Analytics** tab
2. Enable Web Analytics
3. See page views, performance, etc.

### Vercel Logs

1. Go to **Deployments**
2. Click on a deployment
3. Click **Functions** tab
4. See real-time logs

## Cost Monitoring

### Free Tier Includes:
- 100GB bandwidth/month
- 125k function invocations/month
- 1GB Blob storage (then $0.15/GB)
- Unlimited deployments
- Unlimited preview deployments

### Monitor Usage:
1. Go to **Settings** → **Usage**
2. See current usage vs limits
3. Set up usage alerts (optional)

### Estimated Costs:
- **Hosting**: $0/month (free tier)
- **Blob Storage**: $0-5/month (depends on photos)
- **Claude API**: $2-3/month (depends on usage)
- **Total**: ~$2-8/month

## Turso Production Tips

### Use Production Database

Consider creating a separate production database:

```bash
# Create production database
turso db create deal-hunter-prod

# Apply schema
turso db shell deal-hunter-prod < schema.sql

# Get production credentials
turso db show deal-hunter-prod --url
turso db tokens create deal-hunter-prod

# Update Vercel environment variables with prod credentials
```

### Enable Turso Replicas (Optional)

For better performance globally:

```bash
# Add replica in different region
turso db replicate deal-hunter-prod --location sin  # Singapore
turso db replicate deal-hunter-prod --location fra  # Frankfurt
```

Free tier includes 3 locations!

## Security Checklist

- [x] Environment variables not in code
- [x] `.env.local` in `.gitignore`
- [x] HTTPS enabled (automatic with Vercel)
- [x] API keys stored securely in Vercel
- [x] Turso auth token rotated periodically
- [ ] Add authentication (optional, for your use case)
- [ ] Rate limiting (optional)

## Troubleshooting

### Build Fails

Check build logs:
```bash
vercel logs --follow
```

Common issues:
- Missing environment variables
- TypeScript errors
- Dependency issues

### Functions Timeout

Default timeout: 10 seconds (free tier)
For AI generation, this should be enough.

If needed, upgrade to Hobby plan ($20/month) for 60-second functions.

### Image Upload Fails

1. Verify Blob store is created
2. Check `BLOB_READ_WRITE_TOKEN` exists
3. Check Vercel logs for errors

### Database Connection Error

1. Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
2. Test connection locally with same credentials
3. Check Turso database is accessible

## Performance Optimization

### Enable Edge Functions

Add to pages that benefit from edge:

```typescript
export const runtime = 'edge';
```

### Enable ISR (Incremental Static Regeneration)

For product lists that don't change often:

```typescript
export const revalidate = 3600; // Revalidate every hour
```

### Optimize Images

Already done with Next.js Image component!

## Rollback

If something goes wrong:

1. Go to **Deployments**
2. Find a previous working deployment
3. Click menu (3 dots) → **Promote to Production**

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Discord](https://vercel.com/discord)
- [Turso Discord](https://discord.gg/turso)

## Next Steps

1. ✅ Deploy to production
2. ✅ Enable Blob storage
3. ✅ Add environment variables
4. ✅ Test all features
5. ✅ Install as PWA on phone
6. [ ] Add authentication (if needed)
7. [ ] Set up custom domain
8. [ ] Enable analytics
9. [ ] Monitor costs

Congratulations! Your Deal Hunter PWA is now live! 🎉
