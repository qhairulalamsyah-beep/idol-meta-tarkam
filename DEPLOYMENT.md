# IDOL META - Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    VERCEL       │────▶│    SUPABASE     │◀────│    RAILWAY      │
│   (Frontend)    │     │  (PostgreSQL)   │     │  (WhatsApp Bot) │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Next.js 16             Database              Bot Service
     API Routes             Auth                   Automation
```

---

## 1. Supabase Setup (Database & Auth)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project credentials:
   - Project Reference (e.g., `abcdefghijklmnop`)
   - Database Password

### Step 2: Get Database Connection Strings

1. Go to **Project Settings** → **Database**
2. Find **Connection string** section
3. Copy both URLs:

```
# Transaction mode (for Vercel serverless)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Direct connection (for migrations)
DIRECT_DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Step 3: Run Migrations

Local development:
```bash
# Set your .env with Supabase credentials
bun run db:migrate
```

Or use Supabase Dashboard → SQL Editor to run the schema.

---

## 2. Vercel Setup (Frontend & API)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `bun run build`
   - **Output Directory**: `.next`

### Step 3: Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```env
# Database (from Supabase)
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DIRECT_DATABASE_URL=postgresql://postgres.[REF]:[PASS]@db.[REF].supabase.co:5432/postgres

# Optional: Pusher for real-time
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap1
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1

# Optional: Meta WhatsApp API
META_ACCESS_TOKEN=your_token
META_PHONE_NUMBER_ID=your_phone_id
META_BUSINESS_ACCOUNT_ID=your_account_id
META_WEBHOOK_VERIFY_TOKEN=your_verify_token
META_APP_SECRET=your_app_secret
```

### Step 4: Deploy

Click **Deploy** and wait for the build to complete.

---

## 3. Railway Setup (WhatsApp Bot)

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Select your repository
5. Set **Root Directory** to `mini-services/whatsapp-bot`

### Step 2: Configure Build Settings

- **Builder**: Bun
- **Build Command**: `bun install && bun run postinstall`
- **Start Command**: `bun run start`

### Step 3: Set Environment Variables

In Railway Dashboard → Variables:

```env
# Database (same as Vercel, but use direct connection for bot)
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DIRECT_DATABASE_URL=postgresql://postgres.[REF]:[PASS]@db.[REF].supabase.co:5432/postgres

# Bot API URL (your Vercel app)
BOT_API_URL=https://your-app.vercel.app

# Optional: Meta WhatsApp API (if using official API)
META_ACCESS_TOKEN=your_token
META_PHONE_NUMBER_ID=your_phone_id
```

### Step 4: Deploy

Click **Deploy** and monitor the logs.

### Step 5: Pair WhatsApp

1. Get your Railway bot URL (e.g., `https://your-bot.up.railway.app`)
2. Visit `https://your-bot.up.railway.app/qr` to get the QR code
3. Scan with WhatsApp on your phone

---

## 4. Post-Deployment

### Seed Initial Data

After deployment, seed your database:

```bash
# Local with production database
curl -X POST https://your-app.vercel.app/api/seed
```

Or use the seed button in the app (admin panel).

### Default Admin PIN

- **Default PIN**: `123456`
- Change immediately after first login via Admin Panel → Ganti PIN

---

## Environment Variables Summary

### Vercel (Frontend)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Supabase pooler URL | ✅ |
| `DIRECT_DATABASE_URL` | Supabase direct URL | ✅ |
| `PUSHER_*` | Pusher real-time config | ❌ |
| `META_*` | Meta WhatsApp API | ❌ |

### Railway (Bot)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Supabase pooler URL | ✅ |
| `DIRECT_DATABASE_URL` | Supabase direct URL | ✅ |
| `BOT_API_URL` | Your Vercel app URL | ✅ |
| `META_*` | Meta WhatsApp API | ❌ |

---

## Troubleshooting

### Database Connection Issues

1. Check if IP restrictions are enabled in Supabase
2. Verify connection strings are correct
3. Ensure pooler URL uses port `6543`, direct URL uses `5432`

### Bot Not Connecting

1. Check Railway logs for errors
2. Ensure session files persist (Railway volume)
3. Re-scan QR code if session expired

### Build Errors on Vercel

1. Check `bun` version compatibility
2. Verify all dependencies are in `package.json`
3. Check TypeScript errors with `bun run lint`

---

## Support

For issues or questions:
- GitHub Issues: [Your Repo Issues]
- Documentation: This file
