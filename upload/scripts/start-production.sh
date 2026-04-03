#!/bin/bash

# ===========================================
# IDOL META - Production Start Script
# ===========================================

echo "🚀 Starting IDOL META in production mode..."

# Kill any existing processes
echo "Stopping existing services..."
pkill -f "next start" 2>/dev/null || true
pkill -f "whatsapp-bot" 2>/dev/null || true
sleep 2

# Start WhatsApp Bot in background
echo "Starting WhatsApp Bot..."
cd /home/z/my-project/mini-services/whatsapp-bot
nohup bun start > /var/log/whatsapp-bot.log 2>&1 &
BOT_PID=$!
echo "WhatsApp Bot started with PID: $BOT_PID"
cd /home/z/my-project

# Wait for bot to initialize
sleep 3

# Start Main Application
echo "Starting Main Application..."
cd /home/z/my-project
nohup bun run start > /var/log/idol-meta.log 2>&1 &
APP_PID=$!
echo "Main App started with PID: $APP_PID"

echo ""
echo "✅ IDOL META is running!"
echo ""
echo "Services:"
echo "  - Main App: http://localhost:3000 (PID: $APP_PID)"
echo "  - WhatsApp Bot: http://localhost:6002 (PID: $BOT_PID)"
echo ""
echo "Logs:"
echo "  - Main App: /var/log/idol-meta.log"
echo "  - WhatsApp Bot: /var/log/whatsapp-bot.log"
echo ""
echo "To stop: pkill -f 'next start'; pkill -f 'whatsapp-bot'"
