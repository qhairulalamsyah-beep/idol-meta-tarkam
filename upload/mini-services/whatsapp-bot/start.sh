#!/bin/bash
# IDOL META WhatsApp Bot — Startup Script
# Patches Baileys noise-handler for Bun compatibility, then starts the bot

NOISE_FILE="node_modules/@whiskeysockets/baileys/lib/Utils/noise-handler.js"

# Patch Baileys: inject safety guards for missing logger methods under Bun
if [ -f "$NOISE_FILE" ]; then
  # Add safe logger wrapper right after "logger = logger.child" line
  if ! grep -q "logger.debug = logger.debug || function" "$NOISE_FILE"; then
    sed -i 's|logger = logger.child({ class: .* });|logger = logger.child({ class: '\''ns'\'' });\
    if (!logger.debug) logger.debug = function() {};\
    if (!logger.trace) logger.trace = function() {};\
    if (!logger.info) logger.info = function() {};\
    if (!logger.warn) logger.warn = function() {};\
    if (!logger.error) logger.error = function() {};|' "$NOISE_FILE"
    echo "[start.sh] Baileys noise-handler patched (logger safety guards added)"
  fi
fi

while true; do
  echo "[$(date)] Starting WhatsApp Bot..."
  bun --hot index.ts
  echo "[$(date)] Bot exited, restarting in 2s..."
  sleep 2
done
