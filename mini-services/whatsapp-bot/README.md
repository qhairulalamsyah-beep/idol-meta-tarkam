# IDOL META WhatsApp Bot - Railway Deployment

WhatsApp Bot untuk platform turnamen IDOL META. Dapat di-deploy ke Railway dan terhubung ke Supabase PostgreSQL.

## 🚀 Cara Deploy ke Railway

### 1. Prerequisites
- Akun [Railway](https://railway.app)
- Project Supabase dengan database PostgreSQL
- Repository GitHub dengan kode ini

### 2. Setup Environment Variables di Railway

Tambahkan environment variables berikut di Railway:

```env
# Database - Copy dari Supabase Settings > Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Frontend URL (Vercel)
FRONTEND_URL=https://your-app.vercel.app

# Bot Settings (optional)
BOT_PREFIX=!
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=30000
```

### 3. Deploy ke Railway

1. Buka [Railway Dashboard](https://railway.app/dashboard)
2. Klik "New Project" > "Deploy from GitHub repo"
3. Pilih repository ini
4. Set Root Directory ke `mini-services/whatsapp-bot`
5. Railway akan otomatis mendeteksi `railway.toml`
6. Tambahkan environment variables
7. Deploy!

### 4. Setup Frontend (Vercel)

Tambahkan environment variable di Vercel:

```env
WHATSAPP_BOT_URL=https://your-bot.railway.app
```

## 📱 Fitur Bot

### Perintah Turnamen
- `!status` - Status turnamen saat ini
- `!jadwal` - Jadwal pertandingan
- `!hasil` - Hasil pertandingan
- `!bracket [divisi]` - Bracket turnamen
- `!peringkat [divisi]` - Top 10 pemain
- `!juara [divisi]` - Daftar juara
- `!hadiah` - Total hadiah

### Perintah Pemain
- `!daftar <nama> [divisi] [club]` - Daftar ke turnamen
- `!akun` - Status pendaftaran Anda
- `!pemain [divisi]` - Daftar pemain
- `!profil <nama>` - Profil pemain
- `!mvp` - MVP saat ini

### Perintah Donasi
- `!donasi <jumlah> [pesan]` - Donasi untuk Season 2
- `!sawer <jumlah> [pesan]` - Sawer (tip) pemain
- `!topdonasi` - Top 10 donatur
- `!topsawer` - Top 10 sawer

### Perintah Club
- `!club [nama]` - Ranking club

## 🔧 API Endpoints

Bot menyediakan API endpoints berikut:

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/health` | GET | Health check |
| `/api/status` | GET | Status koneksi WhatsApp |
| `/api/qr` | GET | QR code untuk pairing |
| `/api/send` | POST | Kirim pesan (admin) |
| `/api/broadcast` | POST | Broadcast ke banyak nomor (admin) |
| `/api/logs` | GET | Log aktivitas bot |

## 🔌 Koneksi WhatsApp

### Baileys (Gratis)
1. Buka admin panel di frontend
2. Klik tab "Bot Management"
3. Scan QR code dengan WhatsApp
4. Bot siap digunakan!

### Meta API (Official WhatsApp Business API)
1. Setup di [Meta Business Suite](https://business.facebook.com)
2. Dapatkan Access Token dan Phone Number ID
3. Masukkan di admin panel
4. Aktifkan Meta API

## 🛠️ Development

```bash
# Install dependencies
bun install

# Generate Prisma client
bun run db:generate

# Run in development
bun run dev
```

## 📁 Struktur File

```
whatsapp-bot/
├── index.ts           # Main bot file
├── db-queries.ts      # Prisma database queries
├── db-prisma.ts       # Prisma client
├── templates.ts       # Image template generator
├── premium-templates.ts # Premium image templates
├── prisma/
│   └── schema.prisma  # Database schema
├── auth/              # WhatsApp session files
├── package.json
├── railway.toml       # Railway configuration
└── .env.example       # Environment template
```

## ⚠️ Catatan Penting

1. **Session Persistence**: Folder `auth/` menyimpan session WhatsApp. Di Railway, gunakan volume mount untuk persistence.

2. **Rate Limiting**: Default 5 command per 30 detik per nomor.

3. **Database**: Bot menggunakan database yang sama dengan frontend (Supabase PostgreSQL).

4. **Security**: Jangan expose bot URL ke public. Gunakan authentication untuk API endpoints.

## 📞 Support

Hubungi admin IDOL META untuk bantuan teknis.

---

**IDOL META - Fan Made Edition** 🎮✨
