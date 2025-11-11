#!/bin/bash

# Script to verify the app is ready for Vercel deployment

echo "🔍 Verifying Deal Hunter PWA is ready for deployment..."
echo ""

# Check for required files
echo "✓ Checking required files..."
if [ ! -f "package.json" ]; then
  echo "❌ Missing package.json"
  exit 1
fi

if [ ! -f "next.config.ts" ] && [ ! -f "next.config.js" ]; then
  echo "❌ Missing next.config file"
  exit 1
fi

if [ ! -f ".env.example" ]; then
  echo "❌ Missing .env.example"
  exit 1
fi

echo "✓ All required files present"
echo ""

# Check for .env.local
echo "✓ Checking environment variables..."
if [ ! -f ".env.local" ]; then
  echo "⚠️  Warning: .env.local not found (this is OK if deploying to Vercel)"
  echo "   Make sure to set environment variables in Vercel dashboard"
else
  echo "✓ .env.local exists"

  # Check for required env vars in .env.local
  if ! grep -q "TURSO_DATABASE_URL" .env.local; then
    echo "⚠️  Missing TURSO_DATABASE_URL in .env.local"
  fi

  if ! grep -q "TURSO_AUTH_TOKEN" .env.local; then
    echo "⚠️  Missing TURSO_AUTH_TOKEN in .env.local"
  fi

  if ! grep -q "ANTHROPIC_API_KEY" .env.local; then
    echo "⚠️  Missing ANTHROPIC_API_KEY in .env.local"
  fi
fi
echo ""

# Check for node_modules
echo "✓ Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules not found. Run: npm install"
else
  echo "✓ Dependencies installed"
fi
echo ""

# Try to build
echo "✓ Testing build..."
if npm run build > /dev/null 2>&1; then
  echo "✓ Build successful"
else
  echo "❌ Build failed. Run 'npm run build' to see errors"
  exit 1
fi
echo ""

# Check git status
echo "✓ Checking git status..."
if [ -d ".git" ]; then
  if git diff --quiet && git diff --cached --quiet; then
    echo "✓ All changes committed"
  else
    echo "⚠️  You have uncommitted changes. Commit before deploying:"
    echo "   git add ."
    echo "   git commit -m 'Ready for deployment'"
    echo "   git push origin main"
  fi
else
  echo "⚠️  Not a git repository. Initialize with:"
  echo "   git init"
  echo "   git add ."
  echo "   git commit -m 'Initial commit'"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 DEPLOYMENT CHECKLIST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Before deploying to Vercel, make sure you have:"
echo ""
echo "  1. ✓ Turso database created"
echo "     → turso db create deal-hunter"
echo "     → turso db show deal-hunter --url"
echo "     → turso db tokens create deal-hunter"
echo ""
echo "  2. ✓ Anthropic API key"
echo "     → https://console.anthropic.com/settings/keys"
echo ""
echo "  3. ✓ Code pushed to Git"
echo "     → git push origin main"
echo ""
echo "  4. ✓ Ready to deploy!"
echo "     → Go to https://vercel.com/new"
echo "     → Import your repository"
echo "     → Add environment variables (see DEPLOYMENT.md)"
echo "     → Click Deploy"
echo ""
echo "  5. ✓ After first deployment:"
echo "     → Enable Vercel Blob storage"
echo "     → Update NEXT_PUBLIC_APP_URL"
echo ""
echo "📖 Full guide: See DEPLOYMENT.md"
echo ""
