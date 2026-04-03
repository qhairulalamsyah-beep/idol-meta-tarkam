#!/bin/bash

# IDOL META WhatsApp Bot - Railway Start Script

echo "════════════════════════════════════════════════════════════"
echo "  🤖 IDOL META WhatsApp Bot - Starting..."
echo "════════════════════════════════════════════════════════════"

# Run Prisma generate
echo "[Setup] Running prisma generate..."
bun run db:generate

# Start the bot
echo "[Setup] Starting WhatsApp bot..."
exec bun index.ts
