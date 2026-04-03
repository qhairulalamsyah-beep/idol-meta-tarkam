#!/bin/bash

# ===========================================
# IDOL META - Multi-Bot Manager
# ===========================================

BOT_DIR="/home/z/my-project/mini-services"
LOG_DIR="/var/log"

show_help() {
    echo "🤖 IDOL META - Multi-Bot Manager"
    echo ""
    echo "Usage: ./bot-manager.sh [command] [bot_number]"
    echo ""
    echo "Commands:"
    echo "  start [n]     Start bot n (1, 2, 3...)"
    echo "  stop [n]      Stop bot n"
    echo "  restart [n]   Restart bot n"
    echo "  status        Show all bots status"
    echo "  qr [n]        Show QR code URL for bot n"
    echo "  logs [n]      Show logs for bot n"
    echo ""
    echo "Examples:"
    echo "  ./bot-manager.sh start 1    # Start bot 1"
    echo "  ./bot-manager.sh start 2    # Start bot 2"
    echo "  ./bot-manager.sh status     # Show all bots"
    echo ""
}

get_port() {
    case $1 in
        1) echo "6002" ;;
        2) echo "6003" ;;
        3) echo "6004" ;;
        *) echo "6002" ;;
    esac
}

get_bot_dir() {
    case $1 in
        1) echo "$BOT_DIR/whatsapp-bot" ;;
        2) echo "$BOT_DIR/whatsapp-bot-2" ;;
        3) echo "$BOT_DIR/whatsapp-bot-3" ;;
        *) echo "$BOT_DIR/whatsapp-bot" ;;
    esac
}

start_bot() {
    local bot_num=$1
    local port=$(get_port $bot_num)
    local dir=$(get_bot_dir $bot_num)
    
    if [ ! -d "$dir" ]; then
        echo "❌ Bot $bot_num directory not found: $dir"
        exit 1
    fi
    
    echo "🚀 Starting Bot $bot_num on port $port..."
    cd "$dir"
    nohup bun index.ts > /tmp/bot-$bot_num.log 2>&1 &
    echo "✅ Bot $bot_num started!"
    echo "   QR Code: http://localhost:$port/qr"
    echo "   Health: http://localhost:$port/api/health"
}

stop_bot() {
    local bot_num=$1
    local port=$(get_port $bot_num)
    
    echo "🛑 Stopping Bot $bot_num..."
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
    echo "✅ Bot $bot_num stopped"
}

show_status() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           IDOL META - WhatsApp Bot Status                 ║"
    echo "╠═══════════════════════════════════════════════════════════╣"
    
    for i in 1 2 3; do
        port=$(get_port $i)
        dir=$(get_bot_dir $i)
        
        if [ ! -d "$dir" ]; then
            continue
        fi
        
        if lsof -i :$port > /dev/null 2>&1; then
            status="🟢 Running"
            # Try to get bot number
            bot_id=$(cat "$dir/auth/creds.json" 2>/dev/null | grep -o '"me":{[^}]*}' | grep -o 'id":"[^"]*"' | cut -d'"' -f4 | cut -d'@' -f1 || echo "Unknown")
            echo "║ Bot $i: $status | Port: $port | Number: $bot_id"
        else
            status="🔴 Stopped"
            echo "║ Bot $i: $status | Port: $port"
        fi
    done
    
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
}

show_qr() {
    local bot_num=$1
    local port=$(get_port $bot_num)
    echo ""
    echo "📱 Bot $bot_num QR Code URL:"
    echo "   http://localhost:$port/qr"
    echo "   http://localhost:$port/qr?format=png"
    echo ""
}

show_logs() {
    local bot_num=$1
    echo "📋 Bot $bot_num logs (Ctrl+C to exit):"
    tail -f /tmp/bot-$bot_num.log
}

case "$1" in
    start)
        start_bot ${2:-1}
        ;;
    stop)
        stop_bot ${2:-1}
        ;;
    restart)
        stop_bot ${2:-1}
        sleep 2
        start_bot ${2:-1}
        ;;
    status)
        show_status
        ;;
    qr)
        show_qr ${2:-1}
        ;;
    logs)
        show_logs ${2:-1}
        ;;
    *)
        show_help
        ;;
esac
