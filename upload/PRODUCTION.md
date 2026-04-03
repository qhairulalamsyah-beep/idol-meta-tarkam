# IDOL META - Production Checklist

## Pre-Deployment

### 1. Environment Variables
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Set `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Set `NEXTAUTH_URL` to your domain
- [ ] Configure database URL
- [ ] Change default admin password
- [ ] Configure Meta API (if using)

### 2. Database
- [ ] Backup existing database: `cp db/custom.db db/custom.db.backup`
- [ ] Run migrations: `bun run db:push`
- [ ] Seed initial data if needed

### 3. Security
- [ ] Review admin passwords
- [ ] Enable HTTPS
- [ ] Configure CORS settings
- [ ] Set up rate limiting
- [ ] Review file upload limits

### 4. Build
- [ ] Run linter: `bun run lint`
- [ ] Build application: `bun run build`
- [ ] Test production build locally

### 5. WhatsApp Bot
- [ ] QR code scanned and session saved
- [ ] Bot tested in groups
- [ ] Meta API configured (optional backup)

## Deployment Commands

```bash
# Deploy everything
bun run deploy

# Or manual steps:
bun install
bun run db:generate
bun run db:push
bun run build

# Start services
bun run start:all
```

## Post-Deployment

### 1. Verification
- [ ] Main app accessible at your domain
- [ ] WhatsApp bot connected (check QR at /qr)
- [ ] Test user registration
- [ ] Test WhatsApp commands
- [ ] Check logs for errors

### 2. Monitoring
- [ ] Set up log rotation
- [ ] Configure error tracking
- [ ] Set up uptime monitoring
- [ ] Database backup schedule

### 3. Documentation
- [ ] Document admin credentials
- [ ] Document API endpoints
- [ ] Document WhatsApp bot commands

## Service Management

```bash
# Start all services
bun run start:all

# Start individual services
bun run start         # Main app only
bun run bot:start     # WhatsApp bot only

# Stop services
pkill -f "next start"
pkill -f "whatsapp-bot"

# View logs
tail -f /var/log/idol-meta.log
tail -f /var/log/whatsapp-bot.log
```

## Troubleshooting

### WhatsApp Bot Issues
1. Check bot logs: `tail -f /tmp/bot.log`
2. Restart bot: `bun run bot:start`
3. Re-scan QR: Delete `auth/` folder and restart

### Database Issues
1. Check database file permissions
2. Run `bun run db:push` to sync schema
3. Restore from backup if needed

### Build Issues
1. Clear `.next` folder: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && bun install`
3. Rebuild: `bun run build`

## Backup Strategy

```bash
# Backup database
cp db/custom.db backups/custom-$(date +%Y%m%d).db

# Backup auth (WhatsApp session)
cp -r mini-services/whatsapp-bot/auth backups/auth-$(date +%Y%m%d)

# Full backup
tar -czf backup-$(date +%Y%m%d).tar.gz db/ mini-services/whatsapp-bot/auth/
```

## Update Strategy

```bash
# Pull latest code
git pull

# Update dependencies
bun install

# Update database
bun run db:push

# Rebuild
bun run build

# Restart services
pkill -f "next start"; pkill -f "whatsapp-bot"
bun run start:all
```
