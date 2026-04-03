# Panduan Deployment - E-Sports Tournament App

## Arsitektur Aplikasi

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Supabase      │     │  Railway/Render │
│   (Frontend +   │────▶│   (PostgreSQL   │     │  (WhatsApp Bot) │
│    API Routes)  │     │    Database)    │     │  - Baileys      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Catatan Penting:**
- Bot WhatsApp Baileys adalah long-running process, **TIDAK BISA** dijalankan di Vercel
- Bot perlu di-deploy terpisah di platform yang mendukung process jangka panjang

---

## Step 1: Setup Supabase (Database)

### 1.1 Buat Akun Supabase
1. Kunjungi [supabase.com](https://supabase.com)
2. Klik "Start your project"
3. Login dengan GitHub

### 1.2 Buat Project Baru
1. Klik "New Project"
2. Isi:
   - **Name**: `esports-tournament`
   - **Database Password**: (generate strong password, simpan!)
   - **Region**: Southeast Asia (Singapore)
3. Klik "Create new project"
4. Tunggu ± 2 menit hingga project ready

### 1.3 Dapatkan Connection String
1. Buka project > Settings (gear icon) > Database
2. Scroll ke "Connection string"
3. Copy **URI** untuk:
   - **Transaction mode (port 6543)** → `DATABASE_URL`
   - **Session mode (port 5432)** → `DIRECT_DATABASE_URL`

### 1.4 Enable Connection Pooling
1. Settings > Database > Connection pooling
2. Enable "Connection pooling"
3. Mode: Transaction

---

## Step 2: Deploy ke Vercel

### 2.1 Push ke GitHub
```bash
git init
git add .
git commit -m "Initial commit - E-Sports Tournament App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/esports-tournament.git
git push -u origin main
```

### 2.2 Deploy di Vercel
1. Kunjungi [vercel.com](https://vercel.com)
2. Login dengan GitHub
3. Klik "Add New" > "Project"
4. Import repository `esports-tournament`
5. Konfigurasi:
   - **Framework Preset**: Next.js
   - **Build Command**: `npx prisma generate && next build`
   - **Output Directory**: `.next`

### 2.3 Set Environment Variables
Di Vercel Dashboard > Settings > Environment Variables:

```
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DIRECT_DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@db.[REF].supabase.co:5432/postgres
NEXTAUTH_SECRET=[generate-with-openssl-rand-base64-32]
NEXTAUTH_URL=https://your-app.vercel.app
```

### 2.4 Deploy
1. Klik "Deploy"
2. Tunggu hingga selesai (± 2-3 menit)
3. Aplikasi siap di `https://your-app.vercel.app`

---

## Step 3: Setup Database Schema

### 3.1 Install Prisma CLI (lokal)
```bash
npm install -g prisma
```

### 3.2 Push Schema ke Supabase
```bash
# Set env vars di lokal untuk sementara
export DATABASE_URL="your-supabase-pooler-url"
export DIRECT_DATABASE_URL="your-supabase-direct-url"

npx prisma db push
```

Atau jalankan via Vercel:
1. Buka Vercel Dashboard > Project > Deployments
2. Klik tiga titik di deployment terbaru
3. Pilih "Redeploy" dengan override build command:
   ```
   npx prisma db push && next build
   ```

---

## Step 4: Deploy Bot WhatsApp (Railway)

### 4.1 Setup Railway
1. Kunjungi [railway.app](https://railway.app)
2. Login dengan GitHub
3. Klik "New Project" > "Deploy from GitHub repo"
4. Pilih repository `esports-tournament`

### 4.2 Konfigurasi Bot Service
Railway akan detect `mini-services/whatsapp-bot/package.json`

Set working directory:
- Root Directory: `mini-services/whatsapp-bot`

### 4.3 Set Environment Variables
```
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DIRECT_DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@db.[REF].supabase.co:5432/postgres
MAIN_APP_URL=https://your-app.vercel.app
```

### 4.4 Deploy
Railway akan otomatis deploy dan restart bot

---

## Step 5: Scan QR WhatsApp

1. Buka Railway Dashboard
2. Lihat logs bot
3. Scan QR code yang muncul dengan WhatsApp di HP
4. Bot akan terhubung dan siap digunakan

---

## Alternatif: Render.com (Free Tier)

Jika Railway tidak ada free tier:

1. Kunjungi [render.com](https://render.com)
2. Create new "Background Worker"
3. Connect GitHub repository
4. Set:
   - **Build Command**: `cd mini-services/whatsapp-bot && bun install`
   - **Start Command**: `cd mini-services/whatsapp-bot && bun run index.ts`
5. Add environment variables

---

## Monitoring & Logs

### Vercel
- Dashboard > Project > Deployments > View Logs

### Supabase
- Dashboard > Project > Logs > Database logs

### Railway/Render
- Dashboard > Service > Logs

---

## Troubleshooting

### Database Connection Error
- Pastikan DATABASE_URL menggunakan port 6543 (pooler)
- Pastikan DIRECT_DATABASE_URL menggunakan port 5432 (direct)
- Cek IP whitelist di Supabase jika perlu

### Prisma Error
- Jalankan `npx prisma generate` sebelum build
- Pastikan schema.prisma menggunakan `provider = "postgresql"`

### Bot Not Connecting
- Hapus folder `auth/` dan scan QR ulang
- Cek logs untuk error detail

---

## Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | Free |
| Supabase | Free Tier | Free (500MB DB, 5GB bandwidth) |
| Railway | Starter | $5/month (cukup untuk bot) |
| Render | Free | Free (dengan limitasi) |

**Total**: ~$0-5/bulan
