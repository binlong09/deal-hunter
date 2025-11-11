# Deal Hunter PWA

A Progressive Web App for finding, curating, and sharing product deals from Costco/Sam's Club to Facebook. Built with Next.js 15, Turso (SQLite), Vercel, and Claude AI.

## Features

- 📸 **Photo Capture**: Use your phone camera to capture product photos in-store
- 🎯 **Product Curation**: Review, approve, and organize deals
- 🤖 **AI Post Generation**: Generate engaging Facebook posts with Claude AI
- 📱 **PWA Support**: Works offline, installable on mobile devices
- 🚀 **Serverless**: Deployed on Vercel with zero maintenance
- 💾 **Turso Database**: Fast, reliable SQLite that never expires

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: Turso (libSQL/SQLite)
- **Storage**: Vercel Blob
- **AI**: Anthropic Claude API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Turso CLI
- Anthropic API key
- Vercel account (free tier)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo>
   cd dealHunterPWA
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Turso Database**
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash

   # Create database
   turso db create deal-hunter

   # Apply schema
   turso db shell deal-hunter < schema.sql

   # Get credentials
   turso db show deal-hunter --url
   turso db tokens create deal-hunter
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your credentials:
   - `TURSO_DATABASE_URL`: Your Turso database URL
   - `TURSO_AUTH_TOKEN`: Your Turso auth token
   - `ANTHROPIC_API_KEY`: Your Claude API key
   - `BLOB_READ_WRITE_TOKEN`: Auto-set by Vercel

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Add environment variables in Vercel dashboard**
   - Go to Project Settings → Environment Variables
   - Add: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ANTHROPIC_API_KEY`

4. **Enable Vercel Blob Storage**
   - Go to Storage tab in Vercel dashboard
   - Create Blob store
   - Token is automatically added to environment

## Usage

### 1. Capture Products (Husband)

1. Go to `/capture`
2. Select product category (Supplements, Baby, Cosmetics)
3. Start camera
4. Tap anywhere to capture photos
5. Photos upload automatically in background

### 2. Curate Deals (Wife)

1. Go to `/dashboard`
2. Review captured products
3. Approve or reject deals
4. Star favorites
5. Add product details (name, price, discount)

### 3. Generate Posts (Wife)

1. Go to `/generate`
2. Select approved products
3. Click "Generate Posts"
4. AI creates Facebook posts with scheduling
5. Copy text and download optimized images
6. Post to Facebook group

### 4. Manage Example Posts (Optional)

1. Go to `/admin/examples`
2. Add example Facebook posts
3. AI learns your writing style
4. Better post generation over time

## Project Structure

```
deal-hunter-pwa/
├── app/
│   ├── api/                    # API routes
│   │   ├── trips/
│   │   ├── products/
│   │   ├── generate-posts/
│   │   ├── generated-posts/
│   │   └── example-posts/
│   ├── capture/                # Photo capture page
│   ├── dashboard/              # Product curation
│   ├── generate/               # AI post generation
│   ├── admin/examples/         # Example post management
│   └── layout.tsx              # Root layout
├── components/
│   └── CameraCapture.tsx       # Camera component
├── lib/
│   ├── turso.ts                # Database client
│   ├── blob.ts                 # Image storage
│   ├── claude.ts               # AI integration
│   └── utils.ts                # Utilities
├── public/
│   └── manifest.json           # PWA manifest
├── schema.sql                  # Database schema
└── README.md
```

## Database Schema

- **trips**: Shopping trips to Costco/Sam's Club
- **products**: Captured product photos and details
- **example_posts**: Training data for AI
- **generated_posts**: AI-generated Facebook posts
- **post_performance**: Analytics (optional)

## API Routes

- `POST /api/trips` - Create shopping trip
- `GET /api/products` - List products with filters
- `PATCH /api/products?id=X` - Update product
- `POST /api/products/upload` - Upload photo
- `POST /api/products/bulk-update` - Bulk approve/reject
- `POST /api/generate-posts` - Generate AI posts
- `GET /api/generated-posts` - List generated posts
- `GET /api/example-posts` - List example posts

## Cost Breakdown

- **Turso Database**: $0/month (free tier)
- **Vercel Hosting**: $0/month (free tier)
- **Vercel Blob**: $0/month (1GB free)
- **Claude API**: ~$2-3/month (actual usage)

**Total: ~$2-3/month**

## Testing on Mobile

To test on your iPhone/Android:

1. Get your local IP address:
   ```bash
   # Mac
   ipconfig getifaddr en0

   # Windows
   ipconfig

   # Linux
   hostname -I
   ```

2. Open `http://YOUR_IP:3000` on your phone

3. Test camera access and PWA features

## PWA Installation

### iOS (Safari)
1. Open the app in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. App works like a native app

### Android (Chrome)
1. Open the app in Chrome
2. Tap menu (3 dots)
3. Tap "Install app"
4. App works like a native app

## Troubleshooting

### Camera not working
- HTTPS required (localhost works for testing)
- Check browser permissions
- On iOS, Safari is required

### Images not uploading
- Verify Vercel Blob is enabled
- Check `BLOB_READ_WRITE_TOKEN` is set

### Database connection error
- Verify `.env.local` has correct Turso credentials
- Restart dev server after changing env vars

### AI generation failing
- Check `ANTHROPIC_API_KEY` is valid
- Verify you have API credits
- Check API rate limits

## Development

### Adding Sharp for Image Processing

For production-quality image optimization, add Sharp:

```bash
npm install sharp
```

Update `lib/blob.ts` to use Sharp for:
- Image compression
- Thumbnail generation
- Facebook optimization (1200x1200)

### Customizing AI Prompts

Edit `lib/claude.ts` to:
- Adjust tone and style
- Add brand voice
- Customize hashtags
- Change pricing format

### Adding Analytics

Track post performance:
- Likes, comments, orders
- Conversion rates
- Engagement scores

## Future Enhancements

- [ ] OCR for automatic price extraction
- [ ] Barcode scanning
- [ ] Multi-language support
- [ ] Performance analytics dashboard
- [ ] Automated posting to Facebook
- [ ] Inventory management
- [ ] Customer order tracking

## License

MIT

## Support

For issues or questions:
- Check `SETUP.md` for detailed setup
- Review troubleshooting section
- Open an issue on GitHub

## Credits

Built with:
- [Next.js](https://nextjs.org)
- [Turso](https://turso.tech)
- [Anthropic Claude](https://anthropic.com)
- [Vercel](https://vercel.com)
