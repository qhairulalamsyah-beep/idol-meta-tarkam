# IDOL META - TARKAM Fan Made Edition

Platform turnamen esports premium dengan sistem bracket, leaderboard, dan WhatsApp Bot integration.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC)

---

## 📋 Daftar Isi

1. [Fitur Utama](#-fitur-utama)
2. [Tech Stack](#-tech-stack)
3. [Instalasi](#-instalasi)
4. [Konfigurasi](#-konfigurasi)
5. [Struktur Project](#-struktur-project)
6. [WhatsApp Bot](#-whatsapp-bot)
7. [Multi-Bot Setup](#-multi-bot-setup)
8. [Production Deployment](#-production-deployment)
9. [API Endpoints](#-api-endpoints)
10. [Troubleshooting](#-troubleshooting)

---

## 🎮 Fitur Utama

### Platform Turnamen
- ✅ Sistem pendaftaran pemain otomatis
- ✅ Bracket system (Single & Double Elimination)
- ✅ Grand Final system
- ✅ Leaderboard & ranking
- ✅ Club/Team management
- ✅ MVP tracking
- ✅ Divisi Male & Female

### WhatsApp Bot
- ✅ 22 perintah bot (!bantuan, !daftar, !status, dll)
- ✅ Support chat pribadi & grup
- ✅ Image templates untuk hasil
- ✅ Multi-bot support
- ✅ Rate limiting
- ✅ Meta API integration (backup)

### Fitur Lainnya
- ✅ PWA (Progressive Web App)
- ✅ Dark mode
- ✅ Responsive design
- ✅ Real-time updates
- ✅ Donation & sawer system

---

## 🛠 Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | SQLite + Prisma ORM |
| WhatsApp | Baileys 7.0 (WhatsApp Web API) |
| Runtime | Bun |

---

## 📦 Instalasi

### Prerequisites
- Bun >= 1.0
- Node.js >= 18 (opsional)

### Langkah Instalasi

```bash
# 1. Clone repository
git clone <repository-url>
cd idol-meta-tarkam

# 2. Install dependencies
bun install

# 3. Setup database
bun run db:push

# 4. Generate Prisma client
bun run db:generate

# 5. Jalankan development server
bun run dev

# 6. Buka browser
# http://localhost:3000
```

### WhatsApp Bot Setup

```bash
# 1. Install bot dependencies
cd mini-services/whatsapp-bot
bun install

# 2. Jalankan bot
bun --hot index.ts

# 3. Scan QR code
# Buka http://localhost:6002/qr di browser
# Scan dengan WhatsApp di HP

# 4. Bot siap digunakan!
```

---

## ⚙️ Konfigurasi

### Environment Variables

Buat file `.env` atau `.env.production`:

```env
# Database
DATABASE_URL="file:./db/custom.db"

# NextAuth (REQUIRED untuk production)
NEXTAUTH_SECRET="generate-dengan-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-domain.com"

# Admin Password
ADMIN_PASSWORD="admin123"  # Ganti untuk production!

# WhatsApp Bot
WHATSAPP_BOT_URL="http://localhost:6002"
WHATSAPP_BOT_PORT="6002"

# Meta API (Opsional)
META_ACCESS_TOKEN=""
META_PHONE_NUMBER_ID=""
META_API_ENABLED="false"

# Production
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"
```

### Generate Secret Key

```bash
openssl rand -base64 32
```

---

## 📁 Struktur Project

```
idol-meta-tarkam/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── admin/         # Admin endpoints
│   │   │   ├── tournaments/   # Tournament endpoints
│   │   │   ├── users/         # User endpoints
│   │   │   └── whatsapp/      # WhatsApp settings
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main page
│   │
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── admin/            # Admin components
│   │   └── tournament/       # Tournament components
│   │
│   └── lib/                   # Utilities
│       ├── db.ts             # Database client
│       └── utils.ts          # Helper functions
│
├── prisma/
│   └── schema.prisma         # Database schema
│
├── db/
│   └── custom.db             # SQLite database
│
├── mini-services/
│   ├── whatsapp-bot/         # Bot 1 (port 6002)
│   │   ├── index.ts         # Main bot file
│   │   ├── auth/            # WhatsApp session
│   │   ├── templates.ts     # Image templates
│   │   └── package.json
│   │
│   └── whatsapp-bot-2/       # Bot 2 (port 6003)
│       └── ...
│
├── scripts/
│   ├── deploy.sh            # Deployment script
│   └── start-production.sh  # Production start
│
├── backups/                  # Database backups
│
├── public/                   # Static files
├── .env                      # Environment variables
├── PRODUCTION.md            # Production checklist
└── README.md                # This file
```

---

## 🤖 WhatsApp Bot

### Perintah Bot (22 Commands)

| Perintah | Fungsi |
|----------|--------|
| `!bantuan` | Daftar semua perintah |
| `!daftar <nama> [divisi] [club]` | Daftar turnamen |
| `!akun` | Info akun & pendaftaran |
| `!status` | Status turnamen 📸 |
| `!pemain [divisi]` | Daftar pemain 📸 |
| `!tim` | Lihat tim |
| `!bracket [divisi]` | Bracket pertandingan 📸 |
| `!hasil` | Hasil pertandingan 📸 |
| `!jadwal` | Jadwal pertandingan 📸 |
| `!peringkat [divisi]` | Top 10 pemain 📸 |
| `!juara [divisi]` | Daftar juara 📸 |
| `!hadiah` | Total hadiah |
| `!sawer <jumlah> [pesan]` | Tip pemain |
| `!donasi <jumlah> [pesan]` | Donasi |
| `!mvp` | Info MVP |
| `!profil <nama>` | Profil pemain |
| `!statistik <nama>` | Statistik pemain |
| `!grup` | Klasemen grup |
| `!nextmatch` | Pertandingan selanjutnya |
| `!topdonasi` | Top 10 donatur |
| `!topsawer` | Top 10 sawer |
| `!club [nama]` | Ranking club 📸 |

📸 = Mengirim gambar (premium image template)

### API Endpoints Bot

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/` | GET | Status bot |
| `/qr?format=png` | GET | QR code (PNG) |
| `/qr?format=json` | GET | QR code (JSON) |
| `/api/health` | GET | Health check |
| `/api/send` | POST | Kirim pesan |
| `/api/test` | POST | Test command |
| `/api/whatsapp/messages` | GET | Log messages |
| `/api/meta/config` | GET/POST | Meta API config |

### Kirim Pesan via API

```bash
# Kirim ke nomor pribadi
curl -X POST http://localhost:6002/api/send \
  -H "Content-Type: application/json" \
  -d '{"to": "6281234567890", "message": "Halo!"}'

# Kirim ke grup
curl -X POST http://localhost:6002/api/send \
  -H "Content-Type: application/json" \
  -d '{"to": "120363xxxxx@g.us", "message": "Halo grup!"}'
```

---

## 🔄 Multi-Bot Setup

### Mengapa Multi-Bot?
- Nomor berbeda untuk divisi berbeda
- Backup jika satu nomor diblokir
- Load balancing untuk banyak user

### Struktur Multi-Bot

```
mini-services/
├── whatsapp-bot/      # Bot 1 - Port 6002
├── whatsapp-bot-2/    # Bot 2 - Port 6003
└── whatsapp-bot-3/    # Bot 3 - Port 6004
```

### Menambah Bot Baru

```bash
# 1. Copy folder bot
cp -r mini-services/whatsapp-bot-2 mini-services/whatsapp-bot-3

# 2. Ganti port di index.ts
sed -i 's/PORT = 6003/PORT = 6004/' mini-services/whatsapp-bot-3/index.ts

# 3. Hapus auth lama
rm -rf mini-services/whatsapp-bot-3/auth/*

# 4. Install dependencies
cd mini-services/whatsapp-bot-3
bun install

# 5. Jalankan bot
bun index.ts

# 6. Scan QR di http://localhost:6004/qr
```

### Ganti Nomor Bot

```bash
# 1. Stop bot
pkill -f "whatsapp-bot"

# 2. Hapus auth folder
rm -rf mini-services/whatsapp-bot/auth/*

# 3. Restart bot
cd mini-services/whatsapp-bot && bun index.ts

# 4. Scan QR baru
# Buka http://localhost:6002/qr
```

### Start/Stop Bot

```bash
# Start Bot 1
cd mini-services/whatsapp-bot && bun index.ts &

# Start Bot 2
cd mini-services/whatsapp-bot-2 && bun index.ts &

# Stop Bot 1
lsof -ti :6002 | xargs kill -9

# Stop Bot 2
lsof -ti :6003 | xargs kill -9

# Stop semua bot
pkill -f "whatsapp-bot"
```

---

## 🚀 Production Deployment

### Checklist Pre-Deployment

- [ ] Copy `.env.production.example` ke `.env.production`
- [ ] Generate `NEXTAUTH_SECRET`
- [ ] Set `NEXTAUTH_URL` ke domain production
- [ ] Ganti `ADMIN_PASSWORD`
- [ ] Backup database
- [ ] Scan QR bot dan simpan auth folder

### Build & Deploy

```bash
# 1. Install dependencies
bun install

# 2. Generate Prisma client
bun run db:generate

# 3. Push database schema
bun run db:push

# 4. Build application
bun run build

# 5. Start production
bun run start

# 6. Start WhatsApp bot
cd mini-services/whatsapp-bot && bun start
```

### Atau gunakan script otomatis:

```bash
# Deploy semua
bun run deploy

# Start semua service
bun run start:all
```

### Backup Strategy

```bash
# Backup database
cp db/custom.db backups/custom-$(date +%Y%m%d).db

# Backup WhatsApp auth
cp -r mini-services/whatsapp-bot/auth backups/auth-$(date +%Y%m%d)

# Full backup
tar -czf backup-$(date +%Y%m%d).tar.gz db/ mini-services/whatsapp-bot/auth/
```

### Update Production

```bash
# 1. Pull latest code
git pull

# 2. Update dependencies
bun install

# 3. Update database
bun run db:push

# 4. Rebuild
bun run build

# 5. Restart services
pkill -f "next start"
pkill -f "whatsapp-bot"
bun run start:all
```

---

## 🔌 API Endpoints

### Main App (Port 3000)

#### Authentication
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/admin/auth` | GET | Check admin session |
| `/api/admin/verify-session` | POST | Verify admin login |
| `/api/admin/change-password` | POST | Change admin password |

#### Tournaments
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/tournaments` | GET | List tournaments |
| `/api/tournaments/register` | POST | Register player |
| `/api/tournaments/bracket` | GET | Get bracket data |
| `/api/tournaments/finalize` | POST | Finalize tournament |
| `/api/tournaments/grand-final` | GET | Grand final data |

#### Users & Players
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/users` | GET | List users |
| `/api/users/mvp` | GET | MVP players |

#### Clubs
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/clubs` | GET | List clubs |

#### Payments
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/donations` | GET | List donations |
| `/api/sawer` | GET | List sawer |
| `/api/payments/pending` | GET | Pending payments |
| `/api/payments/confirm` | POST | Confirm payment |

### WhatsApp Bot (Port 6002)

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/` | GET | Bot status |
| `/qr` | GET | QR code for pairing |
| `/api/health` | GET | Health check |
| `/api/send` | POST | Send message |
| `/api/test` | POST | Test command |
| `/api/whatsapp/messages` | GET | Message logs |
| `/api/meta/config` | GET/POST | Meta API config |
| `/api/meta/test` | POST | Test Meta API |

---

## 🔧 Troubleshooting

### WhatsApp Bot Issues

#### Bot tidak terhubung
```bash
# Cek status bot
curl http://localhost:6002/

# Restart bot
pkill -f "whatsapp-bot"
cd mini-services/whatsapp-bot && bun index.ts
```

#### QR tidak muncul
```bash
# Cek log
tail -f /tmp/bot.log

# Hapus auth dan scan ulang
rm -rf mini-services/whatsapp-bot/auth/*
# Restart bot
```

#### Bot tidak bisa kirim ke grup
```bash
# Pastikan menggunakan Baileys 7.0+
cd mini-services/whatsapp-bot
bun add @whiskeysockets/baileys@latest

# Restart bot
```

#### Session expired / logged out
```bash
# Hapus auth dan scan ulang
rm -rf mini-services/whatsapp-bot/auth/*
cd mini-services/whatsapp-bot && bun index.ts
# Scan QR baru
```

### Database Issues

#### Database locked
```bash
# Stop semua proses yang mengakses DB
pkill -f "bun"
pkill -f "next"

# Restart
bun run dev
```

#### Reset database
```bash
# WARNING: Hapus semua data
rm db/custom.db
bun run db:push
```

### Build Issues

#### Build failed
```bash
# Clear cache
rm -rf .next
rm -rf node_modules
bun install
bun run build
```

#### Module not found
```bash
# Reinstall dependencies
rm -rf node_modules bun.lock
bun install
```

### Port Issues

#### Port sudah digunakan
```bash
# Cek apa yang menggunakan port
lsof -i :3000
lsof -i :6002

# Kill process
kill -9 <PID>
```

---

## 📞 Support

### Logs Location
- Main App: `/home/z/my-project/dev.log`
- WhatsApp Bot: `/tmp/bot.log`
- Production: `/var/log/idol-meta.log`

### Useful Commands

```bash
# Cek status semua service
lsof -i :3000 -i :6002 -i :6003

# Cek process bun
ps aux | grep bun

# Monitor logs real-time
tail -f /tmp/bot.log

# Cek database size
ls -lh db/custom.db

# Cek auth folder
ls -la mini-services/whatsapp-bot/auth/
```

---

## 📄 License

This project is for educational and fan-made purposes.

---

## 🙏 Credits

- **IDOL META Team** - Development
- **TARKAM Community** - Support
- **Baileys** - WhatsApp Web API
- **shadcn/ui** - UI Components
- **Next.js** - Framework

---

*Dokumentasi terakhir diperbarui: April 2026*
