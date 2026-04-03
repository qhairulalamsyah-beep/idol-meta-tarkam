#!/bin/bash

# ===========================================
# IDOL META - Production Deployment Script
# ===========================================

set -e

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found!${NC}"
    echo "Creating from example..."
    cp .env.production.example .env.production
    echo -e "${YELLOW}Please edit .env.production with your values${NC}"
    exit 1
fi

# Load environment
export $(cat .env.production | grep -v '^#' | xargs)

echo ""
echo "📦 Step 1/6: Installing dependencies..."
bun install --frozen-lockfile

echo ""
echo "📦 Step 2/6: Generating Prisma client..."
bun run db:generate

echo ""
echo "📦 Step 3/6: Pushing database schema..."
bun run db:push

echo ""
echo "🔨 Step 4/6: Building Next.js application..."
bun run build

echo ""
echo "📦 Step 5/6: Building WhatsApp bot..."
cd mini-services/whatsapp-bot
bun install --frozen-lockfile
cd ../..

echo ""
echo "✅ Step 6/6: Deployment complete!"
echo ""
echo "To start the application:"
echo "  Production: bun run start"
echo "  WhatsApp Bot: cd mini-services/whatsapp-bot && bun start"
echo ""
echo -e "${GREEN}🎉 Ready for production!${NC}"
