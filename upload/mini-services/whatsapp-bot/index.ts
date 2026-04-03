/**
 * IDOL META - WhatsApp Bot Service (Full Tournament Assistant)
 *
 * A Baileys-powered WhatsApp bot that connects directly to WhatsApp Web
 * for the esports platform "IDOL META - Fan Made Edition".
 *
 * Players can register, check results, view brackets, tip players, and donate
 * — all through WhatsApp commands with `!` prefix.
 *
 * Features:
 *   - Direct WhatsApp Web connection via Baileys
 *   - QR code pairing via HTTP endpoint
 *   - Session persistence (multi-file auth state)
 *   - 20 bot commands (sync + async)
 *   - Rate limiting, activity logging, fuzzy suggestions
 *   - Admin HTTP endpoints for monitoring and broadcast
 *
 * Port: 6002
 * Language: Bahasa Indonesia
 */

import { Database } from "bun:sqlite";
import path from "path";

// ═══════════════════════════════════════════════════════════════════════════
// PINO PATCH — Fix Baileys compatibility with Bun / Node
// Baileys noise-handler.js calls logger.trace() and logger.debug() which
// don't exist in pino v10+. We monkey-patch ALL pino instances to add
// noop methods for trace, debug, and child-created loggers.
// ═══════════════════════════════════════════════════════════════════════════
const noop = function(..._a: any[]) {};
const patchLogger = (logger: any): any => {
  if (!logger) return logger;
  // Add missing methods that Baileys may call
  if (typeof logger.trace !== 'function') logger.trace = noop;
  if (typeof logger.debug !== 'function') logger.debug = noop;
  if (logger.child) {
    const origChild = logger.child.bind(logger);
    logger.child = function(...args: any[]) {
      const child = origChild(...args);
      return patchLogger(child);
    };
  }
  if (logger.levelVal !== undefined && !logger._idolPatched) {
    try { logger._idolPatched = true; } catch {}
  }
  return logger;
};

try {
  const pinoMod = require("pino");
  if (pinoMod?.default) {
    patchLogger(pinoMod.default);
    if (pinoMod.default.prototype) {
      pinoMod.default.prototype.trace = noop;
      pinoMod.default.prototype.debug = noop;
      const origProtoChild = pinoMod.default.prototype.child;
      if (origProtoChild) {
        pinoMod.default.prototype.child = function(this: any, ...args: any[]) {
          const child = origProtoChild.apply(this, args);
          patchLogger(child);
          return child;
        };
      }
    }
  }
  if (pinoMod && pinoMod !== pinoMod.default) {
    patchLogger(pinoMod);
  }
  if (pinoMod?.pino) patchLogger(pinoMod.pino);
  console.log("[WhatsApp Bot] 🔧 Pino patched for Baileys compatibility (trace+debug noop)");
} catch {
  console.log("[WhatsApp Bot] ⚠️ Could not patch pino — Baileys noise handler may crash");
}
import { default as makeWASocket, useMultiFileAuthState as initAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { generateImage } from "./templates";
import * as Premium from "./premium-templates";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface StoredMessage {
  id: string;
  direction: "outbound" | "inbound";
  to: string;
  from: string;
  message: string;
  tournamentId?: string;
  command?: string;
  commandResponse?: string;
  timestamp: string;
  phone?: string;
}

interface SendPayload {
  to: string;
  message: string;
  tournamentId?: string;
}

interface WebhookPayload {
  from: string;
  message: string;
  timestamp?: string;
}

interface CommandResult {
  reply: string;
  command: string;
  isAsync?: boolean;
}

interface DbRow {
  [key: string]: unknown;
}

interface ActivityLog {
  id: string;
  command: string;
  sender: string;
  replyPreview: string;
  success: boolean;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// META API TYPES & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface MetaApiConfig {
  accessToken: string | null;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  webhookVerifyToken: string | null;
  appSecret: string | null;
  enabled: boolean;
}

interface MetaApiMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Default Meta API config (will be loaded from DB)
let metaApiConfig: MetaApiConfig = {
  accessToken: null,
  phoneNumberId: null,
  businessAccountId: null,
  webhookVerifyToken: null,
  appSecret: null,
  enabled: false,
};

// Meta API version
const META_API_VERSION = 'v21.0';
const META_API_BASE = 'https://graph.facebook.com';

/**
 * Send a text message via Meta WhatsApp Business API
 */
async function sendMetaApiMessage(
  to: string,
  text: string
): Promise<MetaApiMessageResponse> {
  if (!metaApiConfig.enabled || !metaApiConfig.accessToken || !metaApiConfig.phoneNumberId) {
    return { success: false, error: 'Meta API not configured' };
  }

  // Format phone number (remove @s.whatsapp.net if present, ensure country code)
  let phone = to.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '');

  // Meta API doesn't support group messages directly (@g.us)
  if (to.includes('@g.us')) {
    return { success: false, error: 'Meta API does not support group messaging' };
  }

  try {
    const url = `${META_API_BASE}/${META_API_VERSION}/${metaApiConfig.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metaApiConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.error?.error_user_msg || 'Unknown error';
      console.error('[WhatsApp Bot] Meta API error:', errorMsg);
      return { success: false, error: errorMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(`[WhatsApp Bot] ✅ Meta API message sent: ${messageId}`);
    return { success: true, messageId };

  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error('[WhatsApp Bot] Meta API request failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Send an image message via Meta WhatsApp Business API
 */
async function sendMetaApiImage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<MetaApiMessageResponse> {
  if (!metaApiConfig.enabled || !metaApiConfig.accessToken || !metaApiConfig.phoneNumberId) {
    return { success: false, error: 'Meta API not configured' };
  }

  let phone = to.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '');

  if (to.includes('@g.us')) {
    return { success: false, error: 'Meta API does not support group messaging' };
  }

  try {
    const url = `${META_API_BASE}/${META_API_VERSION}/${metaApiConfig.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metaApiConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption || undefined,
        },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.error?.error_user_msg || 'Unknown error';
      console.error('[WhatsApp Bot] Meta API image error:', errorMsg);
      return { success: false, error: errorMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(`[WhatsApp Bot] ✅ Meta API image sent: ${messageId}`);
    return { success: true, messageId };

  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error('[WhatsApp Bot] Meta API image request failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Load Meta API configuration from database
 */
function loadMetaApiConfig(): void {
  try {
    const row = safeGet(
      `SELECT metaAccessToken, metaPhoneNumberId, metaBusinessAccountId,
              metaWebhookVerifyToken, metaAppSecret, metaApiEnabled
       FROM WhatsAppSettings LIMIT 1`
    );

    if (row) {
      metaApiConfig = {
        accessToken: row.metaAccessToken as string | null,
        phoneNumberId: row.metaPhoneNumberId as string | null,
        businessAccountId: row.metaBusinessAccountId as string | null,
        webhookVerifyToken: row.metaWebhookVerifyToken as string | null,
        appSecret: row.metaAppSecret as string | null,
        enabled: row.metaApiEnabled === true || row.metaApiEnabled === 1 || row.metaApiEnabled === 'true',
      };
      console.log(`[WhatsApp Bot] 📋 Meta API config loaded: enabled=${metaApiConfig.enabled}`);
    } else {
      console.log('[WhatsApp Bot] 📋 No WhatsApp settings found in DB');
    }
  } catch (err) {
    console.error('[WhatsApp Bot] Failed to load Meta API config:', (err as Error).message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PORT = 6002;
const MAX_MESSAGES = 1000;
const MAIN_APP_PORT = 3000;
const COMMAND_PREFIX = "!";
const SERVER_START_TIME = Date.now();

// Rate limiting: max 5 commands per 30 seconds per phone number
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 30_000;

const ALL_COMMANDS = [
  { cmd: "!bantuan", desc: "Tampilkan daftar semua perintah" },
  { cmd: "!daftar <nama> [divisi] [club]", desc: "Daftar ke turnamen (HP otomatis)" },
  { cmd: "!akun", desc: "Cek info akun & pendaftaran Anda" },
  { cmd: "!status", desc: "Status turnamen saat ini 📸" },
  { cmd: "!pemain [divisi]", desc: "Daftar pemain terdaftar 📸" },
  { cmd: "!tim", desc: "Lihat tim pertandingan" },
  { cmd: "!bracket [divisi]", desc: "Ringkasan bracket pertandingan 📸" },
  { cmd: "!hasil", desc: "Hasil pertandingan yang selesai 📸" },
  { cmd: "!jadwal", desc: "Jadwal pertandingan mendatang/berlangsung 📸" },
  { cmd: "!peringkat [divisi]", desc: "Peringkat pemain (Top 10) 📸" },
  { cmd: "!juara [divisi]", desc: "Daftar juara turnamen 📸" },
  { cmd: "!hadiah", desc: "Informasi total hadiah" },
  { cmd: "!sawer <jumlah> [pesan]", desc: "Sawer (tip) pemain" },
  { cmd: "!donasi <jumlah> [pesan]", desc: "Donasi untuk Season 2" },
  { cmd: "!mvp", desc: "Info pemain MVP saat ini" },
  { cmd: "!profil <nama>", desc: "Cari & tampilkan profil pemain" },
  { cmd: "!statistik <nama>", desc: "Statistik detail pemain" },
  { cmd: "!grup", desc: "Klasemen babak grup" },
  { cmd: "!nextmatch", desc: "Pertandingan selanjutnya" },
  { cmd: "!topdonasi", desc: "Top 10 donatur" },
  { cmd: "!topsawer", desc: "Top 10 sawer" },
  { cmd: "!club [nama]", desc: "Lihat ranking club & detail 📸" },
];
// 📸 = Premium image template supported (sends PNG image instead of text)

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════════════════════════

const DB_PATH = path.resolve(import.meta.dir, "../../db/custom.db");

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    try {
      db = new Database(DB_PATH, { readonly: true });
      console.log("[WhatsApp Bot] Connected to SQLite database:", DB_PATH);
    } catch (err) {
      console.error(
        "[WhatsApp Bot] Failed to open database:",
        (err as Error).message
      );
      console.warn(
        "[WhatsApp Bot] Commands that need DB access will return fallback data."
      );
    }
  }
  return db!;
}

function isDbAvailable(): boolean {
  return db !== null;
}

/** Safely run a read query — returns empty array on failure */
function safeQuery(sql: string, params: unknown[] = []): DbRow[] {
  if (!isDbAvailable()) return [];
  try {
    return getDb().query(sql).all(...params) as DbRow[];
  } catch (err) {
    console.error("[WhatsApp Bot] DB query error:", (err as Error).message);
    return [];
  }
}

/** Safely run a scalar query — returns undefined on failure */
function safeGet(sql: string, params: unknown[] = []): DbRow | undefined {
  if (!isDbAvailable()) return undefined;
  try {
    return getDb().query(sql).get(...params) as DbRow | undefined;
  } catch (err) {
    console.error("[WhatsApp Bot] DB get error:", (err as Error).message);
    return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY MESSAGE STORE
// ═══════════════════════════════════════════════════════════════════════════

const messages: StoredMessage[] = [];
let messageCounter = 0;

function generateId(): string {
  messageCounter++;
  return `msg_${Date.now()}_${messageCounter}`;
}

function addMessage(
  msg: Omit<StoredMessage, "id" | "timestamp">
): StoredMessage {
  const stored: StoredMessage = {
    ...msg,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  messages.unshift(stored);
  if (messages.length > MAX_MESSAGES) {
    messages.length = MAX_MESSAGES;
  }
  return stored;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG (in-memory)
// ═══════════════════════════════════════════════════════════════════════════

const activityLogs: ActivityLog[] = [];
const MAX_ACTIVITY_LOGS = 2000;
let totalCommandsProcessed = 0;

// Console log storage for debugging
const consoleLogs: string[] = [];
const MAX_CONSOLE_LOGS = 500;

// Override console.log to also store logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args: any[]) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const message = `[${timestamp}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`;
  consoleLogs.push(message);
  if (consoleLogs.length > MAX_CONSOLE_LOGS) consoleLogs.shift();
  originalConsoleLog.apply(console, args);
};

console.error = function(...args: any[]) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const message = `[${timestamp}] ERROR: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`;
  consoleLogs.push(message);
  if (consoleLogs.length > MAX_CONSOLE_LOGS) consoleLogs.shift();
  originalConsoleError.apply(console, args);
};

function addActivityLog(log: Omit<ActivityLog, "id" | "timestamp">): void {
  const entry: ActivityLog = {
    ...log,
    id: `log_${Date.now()}_${++messageCounter}`,
    timestamp: new Date().toISOString(),
  };
  activityLogs.unshift(entry);
  if (activityLogs.length > MAX_ACTIVITY_LOGS) {
    activityLogs.length = MAX_ACTIVITY_LOGS;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITER (in-memory)
// ═══════════════════════════════════════════════════════════════════════════

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Check if a phone number is rate limited.
 * Returns true if the request should be BLOCKED (rate limit exceeded).
 * Also cleans up old timestamps.
 */
function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  let entry = rateLimitMap.get(phone);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(phone, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  // If at limit, block
  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }

  // Record this request
  entry.timestamps.push(now);

  // Prune the map if it grows too large
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (val.timestamps.length === 0) {
        rateLimitMap.delete(key);
      }
    }
  }

  return false;
}

/** Get the number of currently rate-limited users (users who hit the limit) */
function getRateLimitedCount(): number {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  let count = 0;
  for (const entry of rateLimitMap.values()) {
    const recent = entry.timestamps.filter((t) => t > windowStart);
    if (recent.length >= RATE_LIMIT_MAX) {
      count++;
    }
  }
  return count;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST data to the main Next.js app (direct connection to port 3000).
 */
async function postToMainApp(
  apiPath: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const url = `http://localhost:${MAIN_APP_PORT}/${apiPath}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { ok: response.ok, data };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[WhatsApp Bot] API call failed (${apiPath}):`, msg);
    return { ok: false, error: msg };
  }
}

/**
 * GET data from the main Next.js app.
 */
async function getFromMainApp(
  apiPath: string,
  queryParams?: Record<string, string>
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const params = queryParams
    ? "?" + new URLSearchParams(queryParams).toString()
    : "";
  const url = `http://localhost:${MAIN_APP_PORT}/${apiPath}${params}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return { ok: response.ok, data };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[WhatsApp Bot] API GET failed (${apiPath}):`, msg);
    return { ok: false, error: msg };
  }
}

/**
 * PUT data to the main Next.js app (for updates).
 */
async function putToMainApp(
  apiPath: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const url = `http://localhost:${MAIN_APP_PORT}/${apiPath}`;
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { ok: response.ok, data };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[WhatsApp Bot] API PUT failed (${apiPath}):`, msg);
    return { ok: false, error: msg };
  }
}

/** Format a number as Indonesian Rupiah */
function formatMoney(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
}

/**
 * Normalize a phone number or JID to a clean phone number format.
 * Handles various WhatsApp JID formats:
 *   - 62812345678@s.whatsapp.net → 62812345678
 *   - 10814945763505@lid → 10814945763505 (WhatsApp Lid format)
 *   - 62812345678@g.us → 62812345678 (group JID, shouldn't be used for phone)
 * Also handles plain phone numbers with various formatting.
 */
function normalizePhoneNumber(input: string): string {
  if (!input) return '';

  // Remove any JID suffix (@s.whatsapp.net, @lid, @g.us, etc.)
  let phone = input.replace(/@(s\.whatsapp\.net|lid|g\.us|broadcast|newsletter)$/, '');

  // Remove any non-numeric characters except +
  phone = phone.replace(/[^\d+]/g, '');

  // Remove leading + if present (we'll add it back for display)
  if (phone.startsWith('+')) {
    phone = phone.substring(1);
  }

  return phone;
}

/**
 * Check if the input is a WhatsApp Lid ID (not a real phone number)
 * Lid IDs are used by WhatsApp for privacy - they hide the real phone number
 * Can detect from original JID format or from the normalized number pattern
 */
function isLidId(input: string): boolean {
  // Check original JID format
  if (input.includes('@lid')) return true;

  // Check normalized number pattern - Lid IDs are typically:
  // - 14-16 digits long
  // - Start with 1 (internal WhatsApp prefix)
  // - Don't match standard phone patterns
  const normalized = input.replace(/[^\d]/g, '');
  if (normalized.length >= 14 && normalized.startsWith('1')) {
    return true;
  }

  return false;
}

/**
 * Format a phone number for display.
 * Indonesian format: +62 812-3456-7890
 * International format: +1 234-567-8900
 * For Lid IDs, shows as "WhatsApp ID" since it's not a real phone number
 */
function formatPhoneForDisplay(phone: string): string {
  // Check if this is a Lid ID (not a real phone number)
  if (isLidId(phone)) {
    const lidNumber = phone.replace(/[^\d]/g, '');
    return `WhatsApp ID: ${lidNumber}`;
  }

  const normalized = phone.replace(/[^\d]/g, '');

  if (!normalized) return phone; // Return original if can't normalize

  // Indonesian number formatting
  if (normalized.startsWith('62')) {
    // Remove country code for formatting
    const rest = normalized.substring(2);
    // Format: +62 812-3456-7890 or +62 8xx-xxxx-xxxx
    if (rest.length >= 9 && rest.length <= 12) {
      // Mobile numbers typically: 8xx-xxxx-xxxx
      const prefix = rest.substring(0, 3);
      const middle = rest.substring(3, 7);
      const suffix = rest.substring(7);
      return `+62 ${prefix}-${middle}-${suffix}`;
    }
    // Fallback: just add +62
    return `+62 ${rest}`;
  }

  // If starts with 0 (local Indonesian format), convert to +62
  if (normalized.startsWith('0')) {
    const rest = normalized.substring(1);
    if (rest.length >= 9 && rest.length <= 12) {
      const prefix = rest.substring(0, 3);
      const middle = rest.substring(3, 7);
      const suffix = rest.substring(7);
      return `+62 ${prefix}-${middle}-${suffix}`;
    }
    return `+62 ${rest}`;
  }

  // For other international numbers (starting with country codes other than 62)
  // Check if it looks like a valid phone number (10-13 digits)
  if (normalized.length >= 10 && normalized.length <= 13) {
    // Try to format nicely
    if (normalized.length === 10) {
      return `+${normalized.substring(0, 2)} ${normalized.substring(2, 5)}-${normalized.substring(5, 8)}-${normalized.substring(8)}`;
    } else if (normalized.length === 11) {
      return `+${normalized.substring(0, 2)} ${normalized.substring(2, 5)}-${normalized.substring(5, 8)}-${normalized.substring(8)}`;
    } else if (normalized.length === 12) {
      return `+${normalized.substring(0, 2)} ${normalized.substring(2, 6)}-${normalized.substring(6)}`;
    }
    return `+${normalized}`;
  }

  // For numbers longer than 13 digits that don't start with 1 (Lid pattern)
  // Just show as-is with + prefix
  if (normalized.length > 13) {
    return `+${normalized}`;
  }

  // Short numbers - just return with +
  return `+${normalized}`;
}

/**
 * Format phone for database storage (normalized without + or spaces)
 */
function formatPhoneForDb(phone: string): string {
  return normalizePhoneNumber(phone);
}

/** Status label mapping */
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    setup: "🔧 Persiapan",
    registration: "📝 Registrasi",
    ongoing: "🔴 Berlangsung",
    completed: "✅ Selesai",
    pending: "⏳ Menunggu",
    approved: "✅ Disetujui",
    rejected: "❌ Ditolak",
  };
  return map[status] || status;
}

/** Get round label from round number and max round */
function getRoundLabel(round: number, maxRound: number): string {
  if (round === maxRound) return "FINAL";
  if (round === maxRound - 1) return "SEMIFINAL";
  if (round >= 4 && round === maxRound - 2) return "QUARTERFINAL";
  return `ROUND ${round}`;
}

/** Parse a command string into command name and args */
function parseCommand(raw: string): { cmd: string; args: string } {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const spaceIdx = lower.indexOf(" ");
  if (spaceIdx === -1) {
    return { cmd: lower, args: "" };
  }
  return {
    cmd: lower.substring(0, spaceIdx),
    args: trimmed.substring(spaceIdx + 1).trim(),
  };
}

/** Extract quoted or space-separated tokens from args string */
function parseArgs(args: string, maxTokens: number): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(args)) !== null && tokens.length < maxTokens) {
    tokens.push(match[1] || match[2]);
  }
  return tokens;
}

/** Get tier icon emoji */
function getTierIcon(tier: string): string {
  switch (tier?.toUpperCase()) {
    case "S":
      return "🌟";
    case "A":
      return "⭐";
    default:
      return "🔵";
  }
}

/** Format a date/ISO string to a readable Indonesian format */
function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const day = d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
    return `📅 ${day} ⏰ ${time}`;
  } catch {
    return "";
  }
}

/** Format a time-only string (HH:MM) from ISO */
function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND HANDLERS (Sync — DB reads only)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * !bantuan — Help menu
 * Show all available commands with descriptions.
 */
function cmdBantuan(): CommandResult {
  const lines: string[] = [
    "🎮 *IDOL META BOT*",
    "✨ Asisten Turnamen Esports",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    "🏆 *PERINTAH TURNAMEN*",
    "   ▸ !status - Status turnamen",
    "   ▸ !jadwal - Jadwal pertandingan",
    "   ▸ !hasil - Hasil pertandingan",
    "   ▸ !bracket [divisi] - Bracket turnamen",
    "   ▸ !peringkat [divisi] - Top 10 pemain",
    "   ▸ !juara [divisi] - Daftar juara",
    "   ▸ !hadiah - Total hadiah",
    "",
    "👥 *PERINTAH PEMAIN*",
    "   ▸ !daftar <nama> [divisi] [club]",
    "   ▸ !akun - Status pendaftaran Anda",
    "   ▸ !pemain [divisi] - Daftar pemain",
    "   ▸ !profil <nama> - Profil pemain",
    "   ▸ !statistik <nama> - Statistik detail",
    "   ▸ !mvp - MVP saat ini",
    "",
    "💰 *PERINTAH DONASI*",
    "   ▸ !donasi <jumlah> [pesan]",
    "   ▸ !sawer <jumlah> [pesan]",
    "   ▸ !topdonasi - Top donatur",
    "   ▸ !topsawer - Top sawer",
    "",
    "🏢 *PERINTAH CLUB*",
    "   ▸ !club [nama] - Ranking club",
    "   ▸ !tim - Lihat tim",
    "   ▸ !grup - Klasemen grup",
    "   ▸ !nextmatch - Match selanjutnya",
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    "💡 *Contoh Penggunaan:*",
    "   → !daftar Joko",
    "   → !daftar Sari female",
    "   → !daftar Joko male NEXUS",
    "   → !sawer 10000 Semangat!",
    "   → !profil Joko",
    "",
    "✨ *Powered by IDOL META*",
  ];

  return { command: "!bantuan", reply: lines.join("\n") };
}

/**
 * !status — Tournament status overview
 * Read latest tournaments with status, division, week, prize pool, player & match counts.
 */
function cmdStatus(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!status",
      reply: [
        "⚠️ *ERROR*",
        "━━━━━━━━━━━━━━━━━━━━━",
        "",
        "Database tidak tersedia saat ini.",
        "",
        "ℹ️ Coba lagi nanti atau hubungi admin.",
      ].join("\n"),
    };
  }

  const tournaments = safeQuery(
    `SELECT t.id, t.name, t.division, t.type, t.status, t.week, t.bracketType, t.prizePool,
            (SELECT COUNT(*) FROM Registration r WHERE r.tournamentId = t.id) as playerCount,
            (SELECT COUNT(*) FROM Match m WHERE m.tournamentId = t.id) as matchCount
     FROM Tournament t
     ORDER BY t.createdAt DESC
     LIMIT 6`
  );

  if (tournaments.length === 0) {
    return {
      command: "!status",
      reply: [
        "📋 *STATUS TURNAMEN*",
        "━━━━━━━━━━━━━━━━━━━━━",
        "",
        "Belum ada turnamen yang dibuat.",
        "",
        "💡 Hubungi admin untuk membuat",
        "   turnamen baru.",
      ].join("\n"),
    };
  }

  const lines: string[] = [
    "🏆 *IDOL META - STATUS TURNAMEN*",
    "✨ Season Terbaru",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  for (let i = 0; i < tournaments.length; i++) {
    const t = tournaments[i];
    const statusEmoji: Record<string, string> = {
      setup: "🔧",
      registration: "📝",
      ongoing: "🔴",
      completed: "✅",
    };
    const icon = statusEmoji[t.status] || "❓";
    const divIcon = t.division === "male" ? "♂️" : "♀️";
    const week = t.week ? `Week ${t.week}` : "";

    lines.push(`${icon} *${t.name}*`);
    lines.push(`   ${divIcon} ${t.division.toUpperCase()} ${week ? `• ${week}` : ""}`);
    lines.push(`   🎯 Status: _${statusLabel(t.status)}_`);
    lines.push(`   💰 Prize: *Rp${(t.prizePool || 0).toLocaleString("id-ID")}*`);
    lines.push(`   👥 ${t.playerCount} Pemain • ${t.matchCount} Match`);
    
    if (i < tournaments.length - 1) {
      lines.push("");
      lines.push("   ─────────────────");
      lines.push("");
    }
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("ℹ️ Ketik *!jadwal* untuk jadwal pertandingan");

  return { command: "!status", reply: lines.join("\n") };
}

/**
 * !pemain [division] — List registered players
 * Read from DB: Registration + User joined, grouped by status.
 * When no division specified, shows both divisions separately.
 */
function cmdPemain(args: string): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!pemain",
      reply: [
        "⚠️ *ERROR*",
        "━━━━━━━━━━━━━━━━━━━━━",
        "",
        "Database tidak tersedia saat ini.",
        "",
        "ℹ️ Coba lagi nanti.",
      ].join("\n"),
    };
  }

  const division = args.toLowerCase().trim();

  // If specific division requested, show only that division
  if (division === "male" || division === "female") {
    return cmdPemainByDivision(division);
  } else if (args.trim()) {
    return {
      command: "!pemain",
      reply: [
        "❌ *DIVISI TIDAK VALID*",
        "━━━━━━━━━━━━━━━━━━━━━",
        "",
        `Divisi "${args.trim()}" tidak ditemukan.`,
        "",
        "💡 Gunakan:",
        "   ▸ !pemain male",
        "   ▸ !pemain female",
        "   ▸ !pemain (semua divisi)",
      ].join("\n"),
    };
  }

  // No division specified - show both divisions
  const lines: string[] = [
    "👥 *DAFTAR PEMAIN*",
    "🎮 Semua Divisi",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  // Get male division players
  const maleTournament = safeGet(
    `SELECT id, name FROM Tournament WHERE division = 'male' ORDER BY createdAt DESC LIMIT 1`
  );
  let maleCount = 0;
  if (maleTournament) {
    const maleRegs = safeQuery(
      `SELECT r.status as regStatus, r.tierAssigned,
              u.name, u.tier, u.gender
       FROM Registration r
       JOIN User u ON r.userId = u.id
       WHERE r.tournamentId = ?
       ORDER BY
         CASE r.status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
         u.name ASC`,
      [maleTournament.id]
    );
    maleCount = maleRegs.length;

    if (maleRegs.length > 0) {
      const approved = maleRegs.filter((r) => r.regStatus === "approved");
      lines.push(`♂️ *DIVISI MALE*`);
      lines.push(`   _${maleTournament.name}_`);
      lines.push("");

      if (approved.length > 0) {
        lines.push(`   ✅ *Dikonfirmasi* (${approved.length})`);
        for (let i = 0; i < Math.min(approved.length, 8); i++) {
          const r = approved[i];
          const tierIcon = getTierIcon(r.tierAssigned || r.tier);
          const num = (i + 1).toString().padStart(2, "0");
          lines.push(`   ${num}. ${tierIcon} *${r.name}*`);
        }
        if (approved.length > 8) {
          lines.push(`   ⋯ +${approved.length - 8} lainnya`);
        }
      }

      const pending = maleRegs.filter((r) => r.regStatus === "pending");
      if (pending.length > 0) {
        lines.push(`   ⏳ Menunggu: *${pending.length}* pemain`);
      }
      lines.push("");
      lines.push("   ─────────────────");
      lines.push("");
    }
  }

  // Get female division players
  const femaleTournament = safeGet(
    `SELECT id, name FROM Tournament WHERE division = 'female' ORDER BY createdAt DESC LIMIT 1`
  );
  let femaleCount = 0;
  if (femaleTournament) {
    const femaleRegs = safeQuery(
      `SELECT r.status as regStatus, r.tierAssigned,
              u.name, u.tier, u.gender
       FROM Registration r
       JOIN User u ON r.userId = u.id
       WHERE r.tournamentId = ?
       ORDER BY
         CASE r.status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
         u.name ASC`,
      [femaleTournament.id]
    );
    femaleCount = femaleRegs.length;

    if (femaleRegs.length > 0) {
      const approved = femaleRegs.filter((r) => r.regStatus === "approved");
      lines.push(`♀️ *DIVISI FEMALE*`);
      lines.push(`   _${femaleTournament.name}_`);
      lines.push("");

      if (approved.length > 0) {
        lines.push(`   ✅ *Dikonfirmasi* (${approved.length})`);
        for (let i = 0; i < Math.min(approved.length, 8); i++) {
          const r = approved[i];
          const tierIcon = getTierIcon(r.tierAssigned || r.tier);
          const num = (i + 1).toString().padStart(2, "0");
          lines.push(`   ${num}. ${tierIcon} *${r.name}*`);
        }
        if (approved.length > 8) {
          lines.push(`   ⋯ +${approved.length - 8} lainnya`);
        }
      }

      const pending = femaleRegs.filter((r) => r.regStatus === "pending");
      if (pending.length > 0) {
        lines.push(`   ⏳ Menunggu: *${pending.length}* pemain`);
      }
    }
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`📊 Total: *${maleCount + femaleCount}* pemain terdaftar`);
  lines.push("");
  lines.push("ℹ️ Ketik *!pemain male* atau *!pemain female*");

  return { command: "!pemain", reply: lines.join("\n") };
}

/** Helper: Get players for a specific division */
function cmdPemainByDivision(division: string): CommandResult {
  const tournament = safeGet(
    `SELECT id, name FROM Tournament WHERE division = ? ORDER BY createdAt DESC LIMIT 1`,
    [division]
  );

  if (!tournament) {
    return {
      command: "!pemain",
      reply: `📋 Belum ada turnamen divisi ${division === "male" ? "Male" : "Female"}.\n\n💡 Gunakan !daftar <nama> ${division} untuk mendaftar.`,
    };
  }

  const registrations = safeQuery(
    `SELECT r.status as regStatus, r.tierAssigned,
            u.name, u.tier, u.gender, u.points
     FROM Registration r
     JOIN User u ON r.userId = u.id
     WHERE r.tournamentId = ?
     ORDER BY
       CASE r.status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
       u.name ASC`,
    [tournament.id]
  );

  if (registrations.length === 0) {
    return {
      command: "!pemain",
      reply: `📋 Belum ada pemain terdaftar di divisi ${division === "male" ? "Male" : "Female"}.\n\n💡 Gunakan !daftar <nama> ${division} untuk mendaftar.`,
    };
  }

  const lines: string[] = [];
  const divisionIcon = division === "male" ? "♂" : "♀";
  lines.push(`👥 *DAFTAR PEMAIN ${division.toUpperCase()}* ${divisionIcon}`);
  lines.push(`📍 ${tournament.name}\n`);

  // Group by status
  const approved = registrations.filter((r) => r.regStatus === "approved");
  const pending = registrations.filter((r) => r.regStatus === "pending");
  const rejected = registrations.filter((r) => r.regStatus === "rejected");

  if (approved.length > 0) {
    lines.push(`✅ *DISSETUJUI (${approved.length} pemain)*`);
    for (const r of approved) {
      const tierIcon = getTierIcon(r.tierAssigned || r.tier);
      const genderIcon = r.gender === "male" ? "♂" : "♀";
      lines.push(`  ${tierIcon} ${r.name} ${genderIcon} — ${r.tierAssigned || r.tier}`);
    }
    lines.push("");
  }

  if (pending.length > 0) {
    lines.push(`⏳ *MENUNGGU (${pending.length} pemain)*`);
    for (const r of pending) {
      lines.push(`  ⏳ ${r.name} — Menunggu persetujuan`);
    }
    lines.push("");
  }

  if (rejected.length > 0) {
    lines.push(`❌ *DITOLAK (${rejected.length} pemain)*`);
    for (const r of rejected) {
      lines.push(`  ❌ ${r.name} — Ditolak`);
    }
    lines.push("");
  }

  lines.push(`📊 Total: ${registrations.length} pemain`);

  return { command: "!pemain", reply: lines.join("\n") };
}

/**
 * !tim — View teams
 * Read from DB: Team + TeamMember + User
 */
function cmdTim(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!tim",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  // Find the latest tournament with teams
  const tournament = safeGet(
    `SELECT t.id, t.name, t.division, t.bracketType
     FROM Tournament t
     WHERE t.id IN (SELECT DISTINCT tournamentId FROM Team)
     ORDER BY t.createdAt DESC LIMIT 1`
  );

  if (!tournament) {
    return {
      command: "!tim",
      reply: "📋 Belum ada tim yang dibuat.\n\n💡 Approve pemain lalu generate tim melalui website.",
    };
  }

  const teams = safeQuery(
    `SELECT tm.id as teamId, tm.name as teamName, tm.seed, tm.isEliminated, tm.eliminationType
     FROM Team tm
     WHERE tm.tournamentId = ?
     ORDER BY tm.seed ASC`,
    [tournament.id]
  );

  if (teams.length === 0) {
    return {
      command: "!tim",
      reply: `📋 Turnamen "${tournament.name}" belum memiliki tim.\n\n💡 Admin perlu generate tim terlebih dahulu.`,
    };
  }

  const lines: string[] = [
    `👥 *TIM: ${tournament.name}*`,
    tournament.bracketType === "double"
      ? "Eliminasi ganda"
      : tournament.bracketType === "single"
        ? "Eliminasi tunggal"
        : "",
    "",
  ].filter(Boolean);

  for (const team of teams) {
    const eliminationStatus = team.isEliminated
      ? team.eliminationType === "winner"
        ? " [Keluar - Winner Bracket]"
        : " [Keluar - Loser Bracket]"
      : "";
    lines.push(
      `📌 *${team.teamName}* — Seed #${team.seed}${eliminationStatus}`
    );

    // Get members
    const members = safeQuery(
      `SELECT u.name, u.tier, tm.role
       FROM TeamMember tm
       JOIN User u ON tm.userId = u.id
       WHERE tm.teamId = ?`,
      [team.teamId]
    );

    for (const m of members) {
      const tierIcon = getTierIcon(m.tier);
      const roleIcon = m.role === "captain" ? "👑" : "🎮";
      lines.push(`   ${roleIcon} ${tierIcon} ${m.name} (${m.tier})`);
    }
    lines.push("");
  }

  lines.push(`📊 Total: ${teams.length} tim`);

  return { command: "!tim", reply: lines.join("\n") };
}

/**
 * !bracket [division] — Bracket summary
 * Read from DB: Match + Team joined
 * Group by bracket type for double elimination
 * Supports division filtering: !bracket male, !bracket female, or !bracket (all)
 */
function cmdBracket(args: string): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!bracket",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  const divisionInput = args.toLowerCase().trim();

  // Validate division argument
  if (divisionInput && divisionInput !== "male" && divisionInput !== "female") {
    return {
      command: "!bracket",
      reply: `❌ Divisi tidak valid: "${args.trim()}"\n\nGunakan: !bracket male atau !bracket female\nAtau tanpa argumen: !bracket (tampilkan semua divisi)`,
    };
  }

  // If specific division requested
  if (divisionInput === "male" || divisionInput === "female") {
    return cmdBracketByDivision(divisionInput);
  }

  // No division specified - show both divisions summary
  const lines: string[] = ["⚔️ *BRACKET PERTANDINGAN - SEMUA DIVISI*\n"];

  // Male division
  const maleTournament = safeGet(
    `SELECT t.id, t.name, t.division, t.bracketType
     FROM Tournament t
     WHERE t.division = 'male' AND t.id IN (SELECT DISTINCT tournamentId FROM Match)
     ORDER BY t.createdAt DESC LIMIT 1`
  );

  if (maleTournament) {
    const maleMatches = safeQuery(
      `SELECT COUNT(*) as count FROM Match WHERE tournamentId = ?`,
      [maleTournament.id]
    );
    const matchCount = (maleMatches[0]?.count as number) || 0;
    const divisionIcon = "♂";
    lines.push(`\n${divisionIcon} *DIVISI MALE* (${maleTournament.name})`);
    lines.push(`   Tipe: ${maleTournament.bracketType === "double" ? "Eliminasi Ganda" : "Eliminasi Tunggal"}`);
    lines.push(`   Pertandingan: ${matchCount}`);
    lines.push(`   💡 Gunakan !bracket male untuk detail`);
  }

  // Female division
  const femaleTournament = safeGet(
    `SELECT t.id, t.name, t.division, t.bracketType
     FROM Tournament t
     WHERE t.division = 'female' AND t.id IN (SELECT DISTINCT tournamentId FROM Match)
     ORDER BY t.createdAt DESC LIMIT 1`
  );

  if (femaleTournament) {
    const femaleMatches = safeQuery(
      `SELECT COUNT(*) as count FROM Match WHERE tournamentId = ?`,
      [femaleTournament.id]
    );
    const matchCount = (femaleMatches[0]?.count as number) || 0;
    const divisionIcon = "♀";
    lines.push(`\n${divisionIcon} *DIVISI FEMALE* (${femaleTournament.name})`);
    lines.push(`   Tipe: ${femaleTournament.bracketType === "double" ? "Eliminasi Ganda" : "Eliminasi Tunggal"}`);
    lines.push(`   Pertandingan: ${matchCount}`);
    lines.push(`   💡 Gunakan !bracket female untuk detail`);
  }

  if (!maleTournament && !femaleTournament) {
    return {
      command: "!bracket",
      reply: "📋 Belum ada bracket yang dibuat.\n\n💡 Buat turnamen dan generate bracket terlebih dahulu.",
    };
  }

  lines.push("\n💡 Gunakan !bracket male atau !bracket female untuk detail per divisi.");

  return { command: "!bracket", reply: lines.join("\n") };
}

/** Helper: Get bracket for a specific division */
function cmdBracketByDivision(division: 'male' | 'female'): CommandResult {
  const tournament = safeGet(
    `SELECT t.id, t.name, t.division, t.bracketType
     FROM Tournament t
     WHERE t.division = ? AND t.id IN (SELECT DISTINCT tournamentId FROM Match)
     ORDER BY t.createdAt DESC LIMIT 1`,
    [division]
  );

  if (!tournament) {
    return {
      command: "!bracket",
      reply: `📋 Belum ada bracket untuk divisi ${division === 'male' ? 'Male' : 'Female'}.\n\n💡 Buat turnamen dan generate bracket terlebih dahulu.`,
    };
  }

  const matches = safeQuery(
    `SELECT m.round, m.matchNumber, m.scoreA, m.scoreB, m.status, m.bracket,
            tA.name as teamAName, tB.name as teamBName,
            w.name as winnerName, mvp.name as mvpName
     FROM Match m
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     LEFT JOIN Team w ON m.winnerId = w.id
     LEFT JOIN User mvp ON m.mvpId = mvp.id
     WHERE m.tournamentId = ?
     ORDER BY m.bracket ASC, m.round ASC, m.matchNumber ASC`,
    [tournament.id]
  );

  if (matches.length === 0) {
    return {
      command: "!bracket",
      reply: `📋 Turnamen "${tournament.name}" belum memiliki pertandingan.\n\n💡 Admin perlu generate bracket terlebih dahulu.`,
    };
  }

  const isDoubleElim = tournament.bracketType === "double";
  const divisionIcon = division === 'male' ? '♂' : '♀';
  const lines: string[] = [
    `⚔️ *BRACKET ${division.toUpperCase()}* ${divisionIcon}`,
    `📍 ${tournament.name}`,
    isDoubleElim ? "Eliminasi Ganda\n" : "",
  ].filter(Boolean);

  if (isDoubleElim) {
    // Group by bracket type
    const bracketGroups = new Map<string, DbRow[]>();
    for (const match of matches) {
      const bracket = match.bracket || "winners";
      if (!bracketGroups.has(bracket)) bracketGroups.set(bracket, []);
      bracketGroups.get(bracket)!.push(match);
    }

    const bracketLabels: Record<string, string> = {
      winners: "🏆 WINNERS BRACKET",
      losers: "🔄 LOSERS BRACKET",
      grand_final: "👑 GRAND FINAL",
    };

    for (const [bracket, bracketMatches] of bracketGroups) {
      lines.push(`━━ *${bracketLabels[bracket] || bracket.toUpperCase()}* ━━`);
      lines.push(formatMatches(bracketMatches, isDoubleElim));
    }
  } else {
    lines.push(formatMatches(matches, false));
  }

  return { command: "!bracket", reply: lines.join("\n") };
}

/** Format an array of match rows into text lines */
function formatMatches(matches: DbRow[], showBracket: boolean): string {
  const lines: string[] = [];

  // Group by round
  const roundMap = new Map<number, DbRow[]>();
  for (const match of matches) {
    const round = match.round as number;
    if (!roundMap.has(round)) roundMap.set(round, []);
    roundMap.get(round)!.push(match);
  }

  const maxRound = Math.max(...roundMap.keys());

  for (const [round, roundMatches] of roundMap) {
    const roundLabel = getRoundLabel(round, maxRound);
    lines.push(`── *${roundLabel}* ──`);

    for (const match of roundMatches) {
      const teamA = (match.teamAName as string) || "TBD";
      const teamB = (match.teamBName as string) || "TBD";
      const scoreA = match.scoreA !== null ? String(match.scoreA) : "-";
      const scoreB = match.scoreB !== null ? String(match.scoreB) : "-";

      let statusIcon: string;
      if (match.status === "completed") statusIcon = "✅";
      else if (match.status === "ongoing") statusIcon = "🔴";
      else statusIcon = "⏳";

      const bracketTag =
        showBracket && match.bracket && match.bracket !== "winners"
          ? ` [${match.bracket}]`
          : "";

      lines.push(
        `  ${statusIcon} Match ${match.matchNumber}${bracketTag}: ${teamA} *${scoreA}* vs *${scoreB}* ${teamB}`
      );

      if (match.status === "completed" && match.winnerName) {
        lines.push(`     🏆 Pemenang: ${match.winnerName}${match.mvpName ? ` | MVP: ${match.mvpName}` : ""}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * !hasil — Match results (completed matches only)
 */
function cmdHasil(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!hasil",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  const results = safeQuery(
    `SELECT m.round, m.matchNumber, m.scoreA, m.scoreB,
            t.name as tournamentName,
            tA.name as teamAName, tB.name as teamBName,
            w.name as winnerName, mvp.name as mvpName, m.completedAt
     FROM Match m
     JOIN Tournament t ON m.tournamentId = t.id
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     LEFT JOIN Team w ON m.winnerId = w.id
     LEFT JOIN User mvp ON m.mvpId = mvp.id
     WHERE m.status = 'completed'
     ORDER BY m.completedAt DESC
     LIMIT 15`
  );

  if (results.length === 0) {
    return {
      command: "!hasil",
      reply: "📋 Belum ada hasil pertandingan.\n\n💡 Pertandingan yang sudah selesai akan muncul di sini. Gunakan !jadwal untuk melihat pertandingan yang akan datang.",
    };
  }

  const lines: string[] = [
    "📊 *HASIL PERTANDINGAN*\n",
    "Pertandingan terbaru:\n",
  ];

  let currentTournament = "";
  for (const r of results) {
    if (r.tournamentName !== currentTournament) {
      currentTournament = r.tournamentName as string;
      lines.push(`📍 *${currentTournament}*`);
    }

    lines.push(
      `  ✅ ${r.teamAName} *${r.scoreA}* - *${r.scoreB}* ${r.teamBName}`
    );
    lines.push(`     🏆 Pemenang: ${r.winnerName || "-"}`);
    if (r.mvpName) {
      lines.push(`     ⭐ MVP: ${r.mvpName}`);
    }
    if (r.completedAt) {
      lines.push(`     🕐 ${formatDateTime(r.completedAt as string)}`);
    }
    lines.push("");
  }

  lines.push(`📊 Menampilkan ${results.length} pertandingan terbaru`);

  return { command: "!hasil", reply: lines.join("\n") };
}

/**
 * !jadwal — Upcoming/live matches (enhanced with scheduledAt)
 */
function cmdJadwal(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!jadwal",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  // Get live (ongoing) matches first
  const live = safeQuery(
    `SELECT m.round, m.matchNumber, m.scoreA, m.scoreB,
            t.name as tournamentName,
            tA.name as teamAName, tB.name as teamBName,
            m.bracket, m.scheduledAt
     FROM Match m
     JOIN Tournament t ON m.tournamentId = t.id
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     WHERE m.status = 'ongoing'
     ORDER BY m.scheduledAt ASC`
  );

  // Get pending matches sorted by scheduledAt (earliest first) then by matchNumber
  const pending = safeQuery(
    `SELECT m.round, m.matchNumber,
            t.name as tournamentName,
            tA.name as teamAName, tB.name as teamBName,
            m.bracket, m.scheduledAt
     FROM Match m
     JOIN Tournament t ON m.tournamentId = t.id
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     WHERE m.status = 'pending'
     ORDER BY
       CASE WHEN m.scheduledAt IS NOT NULL THEN 0 ELSE 1 END,
       m.scheduledAt ASC,
       m.round ASC,
       m.matchNumber ASC
     LIMIT 10`
  );

  if (live.length === 0 && pending.length === 0) {
    return {
      command: "!jadwal",
      reply: "📋 Tidak ada pertandingan yang dijadwalkan saat ini.\n\n💡 Gunakan !status untuk melihat status turnamen, atau !nextmatch untuk pertandingan selanjutnya.",
    };
  }

  const lines: string[] = ["📅 *JADWAL PERTANDINGAN*\n"];

  if (live.length > 0) {
    lines.push(`🔴 *SEDANG BERLANGSUNG (${live.length})*`);
    for (const m of live) {
      const scheduled = m.scheduledAt ? ` | ⏰ ${formatTime(m.scheduledAt as string)}` : "";
      lines.push(`  🔴 ${m.teamAName || "TBD"} *${m.scoreA ?? 0}* - *${m.scoreB ?? 0}* ${m.teamBName || "TBD"}`);
      lines.push(`     📍 ${m.tournamentName}${m.bracket ? ` [${m.bracket}]` : ""} | Round ${m.round}${scheduled}`);
      lines.push("");
    }
  }

  if (pending.length > 0) {
    lines.push(`⏳ *MENDATANG (${pending.length})*`);
    for (const m of pending) {
      const scheduled = m.scheduledAt
        ? ` | ⏰ ${formatDateTime(m.scheduledAt as string)}`
        : " (waktu belum ditentukan)";
      lines.push(`  ⏳ ${m.teamAName || "TBD"} vs ${m.teamBName || "TBD"}`);
      lines.push(`     📍 ${m.tournamentName}${m.bracket ? ` [${m.bracket}]` : ""} | Round ${m.round} | Match ${m.matchNumber}${scheduled}`);
      lines.push("");
    }
  }

  return { command: "!jadwal", reply: lines.join("\n") };
}

/**
 * !peringkat [division] — Rankings / Leaderboard
 * Supports division filtering: !peringkat male, !peringkat female, or !peringkat (all)
 */
function cmdPeringkat(args: string): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!peringkat",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  const divisionInput = args.toLowerCase().trim();

  // Validate division argument
  if (divisionInput && divisionInput !== "male" && divisionInput !== "female") {
    return {
      command: "!peringkat",
      reply: `❌ Divisi tidak valid: "${args.trim()}"\n\nGunakan: !peringkat male atau !peringkat female\nAtau tanpa argumen: !peringkat (tampilkan semua divisi)`,
    };
  }

  // If specific division requested
  if (divisionInput === "male" || divisionInput === "female") {
    return cmdPeringkatByDivision(divisionInput);
  }

  // No division specified - show both divisions
  const lines: string[] = ["🏅 *PERINGKAT IDOL META - SEMUA DIVISI*\n"];

  // Male division
  const maleRankings = safeQuery(
    `SELECT u.name, u.gender, u.tier, u.points,
            COALESCE(r.wins, 0) as wins,
            COALESCE(r.losses, 0) as losses
     FROM User u
     LEFT JOIN Ranking r ON u.id = r.userId
     WHERE u.gender = 'male'
     ORDER BY u.points DESC, u.name ASC
     LIMIT 10`
  );

  if (maleRankings.length > 0) {
    lines.push("\n♂ *DIVISI MALE*");
    const medals = ["🥇", "🥈", "🥉"];
    for (let i = 0; i < Math.min(5, maleRankings.length); i++) {
      const u = maleRankings[i];
      const rank = medals[i] || `${i + 1}.`;
      const tierIcon = getTierIcon(u.tier);
      lines.push(`  ${rank} ${tierIcon} ${u.name} — ${u.points} pts`);
    }
    if (maleRankings.length > 5) {
      lines.push(`  ... dan ${maleRankings.length - 5} lainnya`);
    }
  } else {
    lines.push("\n♂ *DIVISI MALE*\n  📋 Belum ada data");
  }

  // Female division
  const femaleRankings = safeQuery(
    `SELECT u.name, u.gender, u.tier, u.points,
            COALESCE(r.wins, 0) as wins,
            COALESCE(r.losses, 0) as losses
     FROM User u
     LEFT JOIN Ranking r ON u.id = r.userId
     WHERE u.gender = 'female'
     ORDER BY u.points DESC, u.name ASC
     LIMIT 10`
  );

  if (femaleRankings.length > 0) {
    lines.push("\n♀ *DIVISI FEMALE*");
    const medals = ["🥇", "🥈", "🥉"];
    for (let i = 0; i < Math.min(5, femaleRankings.length); i++) {
      const u = femaleRankings[i];
      const rank = medals[i] || `${i + 1}.`;
      const tierIcon = getTierIcon(u.tier);
      lines.push(`  ${rank} ${tierIcon} ${u.name} — ${u.points} pts`);
    }
    if (femaleRankings.length > 5) {
      lines.push(`  ... dan ${femaleRankings.length - 5} lainnya`);
    }
  } else {
    lines.push("\n♀ *DIVISI FEMALE*\n  📋 Belum ada data");
  }

  lines.push("");
  lines.push("💡 Gunakan !peringkat male atau !peringkat female untuk detail per divisi.");

  return { command: "!peringkat", reply: lines.join("\n") };
}

/** Helper: Get peringkat for a specific division */
function cmdPeringkatByDivision(division: 'male' | 'female'): CommandResult {
  const genderFilter = division === 'female' ? "WHERE u.gender = 'female'" : "WHERE u.gender = 'male'";
  const divisionIcon = division === 'male' ? '♂️' : '♀️';

  const rankings = safeQuery(
    `SELECT u.name, u.gender, u.tier, u.points,
            COALESCE(r.wins, 0) as wins,
            COALESCE(r.losses, 0) as losses
     FROM User u
     LEFT JOIN Ranking r ON u.id = r.userId
     ${genderFilter}
     ORDER BY u.points DESC, u.name ASC
     LIMIT 10`
  );

  if (rankings.length === 0) {
    return {
      command: "!peringkat",
      reply: [
        "📋 *LEADERBOARD*",
        "━━━━━━━━━━━━━━━━━━━━━",
        "",
        `Belum ada data peringkat`,
        `divisi ${division === 'male' ? 'Male' : 'Female'}.`,
        "",
        "💡 Peringkat akan muncul setelah",
        "   turnamen berlangsung.",
      ].join("\n"),
    };
  }

  const lines: string[] = [
    "👑 *LEADERBOARD TOP 10*",
    `${divisionIcon} Divisi ${division.toUpperCase()}`,
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  const medals = ["🥇", "🥈", "🥉"];

  for (let i = 0; i < rankings.length; i++) {
    const u = rankings[i];
    const rank = medals[i] || ` ${(i + 1).toString().padStart(2, "0")}.`;
    const wins = u.wins as number;
    const losses = u.losses as number;
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const genderIcon = u.gender === "male" ? "♂️" : "♀️";
    const tierIcon = getTierIcon(u.tier);

    lines.push(`${rank} *${u.name}* ${genderIcon}`);
    lines.push(`   ${tierIcon} ${u.tier} • 🏆 ${u.points} pts`);
    lines.push(`   ✅ W:${wins} ❌ L:${losses} • ${winRate}% WR`);
    lines.push("");
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("ℹ️ Ketik *!profil <nama>* untuk detail");

  return { command: "!peringkat", reply: lines.join("\n") };
}

/**
 * !hadiah — Prize pool info
 * Show base prize pool + total sawer + total donations
 */
function cmdHadiah(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!hadiah",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  const tournaments = safeQuery(
    `SELECT id, name, division, prizePool
     FROM Tournament
     ORDER BY createdAt DESC LIMIT 5`
  );

  if (tournaments.length === 0) {
    return {
      command: "!hadiah",
      reply: "📋 Belum ada data hadiah turnamen.\n\n💡 Hadiah akan muncul setelah turnamen dibuat oleh admin.",
    };
  }

  // Get total sawer amount
  const sawerRow = safeGet(
    `SELECT COALESCE(SUM(amount), 0) as totalSawer FROM Sawer`
  );
  const totalSawer = (sawerRow?.totalSawer as number) || 0;

  // Get total donations
  const donationRow = safeGet(
    `SELECT COALESCE(SUM(amount), 0) as totalDonation FROM Donation`
  );
  const totalDonation = (donationRow?.totalDonation as number) || 0;

  const lines: string[] = [
    "💰 *INFORMASI HADIAH IDOL META*\n",
  ];

  for (const t of tournaments) {
    const division = t.division === "male" ? "Male" : "Female";
    lines.push(`📍 *${t.name}* (${division})`);
    lines.push(`   🏆 Total Prize Pool: *${formatMoney(t.prizePool)}*`);
    lines.push("");
  }

  lines.push("─────────────────────");
  lines.push(`💸 Total Sawer Masuk: ${formatMoney(totalSawer)}`);
  lines.push(`💝 Total Donasi Season 2: ${formatMoney(totalDonation)}`);
  lines.push(`📊 Grand Total: ${formatMoney(totalSawer + totalDonation)}`);
  lines.push("");
  lines.push("💡 Gunakan !sawer <jumlah> untuk menambah hadiah.");
  lines.push("💡 Gunakan !donasi <jumlah> untuk donasi Season 2.");
  lines.push("💡 Gunakan !topdonasi atau !topsawer untuk melihat kontributor teratas.");

  return { command: "!hadiah", reply: lines.join("\n") };
}

/**
 * !juara [division] — Show tournament champions/winners
 * Supports division filtering: !juara male, !juara female, or !juara (all)
 */
function cmdJuara(args: string): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!juara",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  const divisionInput = args.toLowerCase().trim();

  // Validate division argument
  if (divisionInput && divisionInput !== "male" && divisionInput !== "female") {
    return {
      command: "!juara",
      reply: `❌ Divisi tidak valid: "${args.trim()}"\n\nGunakan: !juara male atau !juara female\nAtau tanpa argumen: !juara (tampilkan semua divisi)`,
    };
  }

  // If specific division requested
  if (divisionInput === "male" || divisionInput === "female") {
    return cmdJuaraByDivision(divisionInput);
  }

  // No division specified - show both divisions
  const lines: string[] = ["🏆 *DAFTAR JUARA - SEMUA DIVISI*\n"];

  // Male division champions
  const maleChampions = getChampionsByDivision('male');
  if (maleChampions.length > 0) {
    lines.push("\n♂ *DIVISI MALE*");
    for (const champ of maleChampions) {
      lines.push(`  👑 *${champ.tournamentName}*`);
      lines.push(`     🥇 Juara 1: ${champ.winnerName || "TBD"}`);
      if (champ.runnerUp) lines.push(`     🥈 Juara 2: ${champ.runnerUp}`);
      if (champ.mvpName) lines.push(`     ⭐ MVP: ${champ.mvpName}`);
      lines.push("");
    }
  }

  // Female division champions
  const femaleChampions = getChampionsByDivision('female');
  if (femaleChampions.length > 0) {
    lines.push("\n♀ *DIVISI FEMALE*");
    for (const champ of femaleChampions) {
      lines.push(`  👑 *${champ.tournamentName}*`);
      lines.push(`     🥇 Juara 1: ${champ.winnerName || "TBD"}`);
      if (champ.runnerUp) lines.push(`     🥈 Juara 2: ${champ.runnerUp}`);
      if (champ.mvpName) lines.push(`     ⭐ MVP: ${champ.mvpName}`);
      lines.push("");
    }
  }

  if (maleChampions.length === 0 && femaleChampions.length === 0) {
    return {
      command: "!juara",
      reply: "📋 Belum ada juara yang tercatat.\n\n💡 Juara akan muncul setelah turnamen selesai dan pemenang ditentukan.",
    };
  }

  lines.push("💡 Gunakan !juara male atau !juara female untuk detail per divisi.");

  return { command: "!juara", reply: lines.join("\n") };
}

/** Helper: Get champions for a specific division */
function cmdJuaraByDivision(division: 'male' | 'female'): CommandResult {
  const champions = getChampionsByDivision(division);
  const divisionIcon = division === 'male' ? '♂' : '♀';

  if (champions.length === 0) {
    return {
      command: "!juara",
      reply: `📋 Belum ada juara untuk divisi ${division === 'male' ? 'Male' : 'Female'}.\n\n💡 Juara akan muncul setelah turnamen selesai.`,
    };
  }

  const lines: string[] = [
    `🏆 *JUARA DIVISI ${division.toUpperCase()}* ${divisionIcon}\n`,
  ];

  for (let i = 0; i < champions.length; i++) {
    const champ = champions[i];
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅";

    lines.push(`${medal} *${champ.tournamentName}*`);
    lines.push(`   Status: ${champ.status === 'completed' ? '✅ Selesai' : '🔴 Berlangsung'}`);
    lines.push(`   🏆 Juara 1: *${champ.winnerName || "TBD"}*`);
    if (champ.runnerUp) lines.push(`   🥈 Juara 2: ${champ.runnerUp}`);
    if (champ.thirdPlace) lines.push(`   🥉 Juara 3: ${champ.thirdPlace}`);
    if (champ.mvpName) lines.push(`   ⭐ MVP: ${champ.mvpName}`);
    lines.push("");
  }

  lines.push("💡 Gunakan !bracket untuk melihat bracket pertandingan.");
  lines.push("💡 Gunakan !peringkat untuk melihat peringkat pemain.");

  return { command: "!juara", reply: lines.join("\n") };
}

/** Helper: Get champions data for a division */
interface ChampionData {
  tournamentName: string;
  tournamentId: string;
  status: string;
  winnerName: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
  mvpName: string | null;
}

function getChampionsByDivision(division: 'male' | 'female'): ChampionData[] {
  const tournaments = safeQuery(
    `SELECT t.id, t.name, t.status, t.bracketType
     FROM Tournament t
     WHERE t.division = ?
     ORDER BY t.createdAt DESC`,
    [division]
  );

  const champions: ChampionData[] = [];

  for (const t of tournaments) {
    const tournamentId = t.id as string;

    // For completed tournaments or those with final matches
    // Get the final match winner
    const finalMatch = safeGet(
      `SELECT m.winnerId, w.name as winnerName, m.mvpId, mvp.name as mvpName,
              m.teamAId, m.teamBId, tA.name as teamAName, tB.name as teamBName
       FROM Match m
       LEFT JOIN Team w ON m.winnerId = w.id
       LEFT JOIN User mvp ON m.mvpId = mvp.id
       LEFT JOIN Team tA ON m.teamAId = tA.id
       LEFT JOIN Team tB ON m.teamBId = tB.id
       WHERE m.tournamentId = ? AND m.status = 'completed'
       ORDER BY m.round DESC, m.matchNumber DESC
       LIMIT 1`,
      [tournamentId]
    );

    let winnerName: string | null = null;
    let runnerUp: string | null = null;
    let mvpName: string | null = null;

    if (finalMatch && finalMatch.winnerName) {
      winnerName = finalMatch.winnerName as string;
      mvpName = finalMatch.mvpName as string | null;

      // Determine runner-up
      if (finalMatch.winnerId === finalMatch.teamAId) {
        runnerUp = finalMatch.teamBName as string;
      } else if (finalMatch.winnerId === finalMatch.teamBId) {
        runnerUp = finalMatch.teamAName as string;
      }
    }

    // Only include if there's at least a winner or tournament is completed
    if (t.status === 'completed' || winnerName) {
      champions.push({
        tournamentName: t.name as string,
        tournamentId,
        status: t.status as string,
        winnerName,
        runnerUp,
        thirdPlace: null, // Would need 3rd place match data
        mvpName,
      });
    }
  }

  return champions;
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW COMMAND HANDLERS (Sync — DB reads only)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * !mvp — Show current MVP player info
 * Reads User where isMVP=true.
 */
function cmdMvp(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!mvp",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  const mvp = safeGet(
    `SELECT u.id, u.name, u.gender, u.tier, u.points, u.isMVP, u.mvpScore,
            COALESCE(r.wins, 0) as wins,
            COALESCE(r.losses, 0) as losses
     FROM User u
     LEFT JOIN Ranking r ON u.id = r.userId
     WHERE u.isMVP = 1
     LIMIT 1`
  );

  if (!mvp) {
    return {
      command: "!mvp",
      reply: [
        "📋 Belum ada MVP yang ditetapkan saat ini.",
        "",
        "💡 MVP biasanya ditetapkan setelah pertandingan final selesai.",
        "💡 Gunakan !peringkat untuk melihat pemain terbaik sementara.",
      ].join("\n"),
    };
  }

  const genderIcon = (mvp.gender as string) === "female" ? "♀" : "♂";
  const genderLabel = (mvp.gender as string) === "female" ? "Female" : "Male";
  const tierIcon = getTierIcon(mvp.tier as string);
  const wins = mvp.wins as number;
  const losses = mvp.losses as number;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Get MVP match count
  const mvpMatchCount = safeGet(
    `SELECT COUNT(*) as count FROM Match WHERE mvpId = ?`,
    [mvp.id]
  );
  const matchMvpCount = (mvpMatchCount?.count as number) || 0;

  const lines: string[] = [
    "👑 *MVP SAAT INI*",
    "─────────────────────",
    `🌟 *${mvp.name}* ${genderIcon}`,
    `   ${tierIcon} Tier ${mvp.tier} | 🏆 ${mvp.points} pts`,
    `   🏓 Divisi: ${genderLabel}`,
    "",
    `📊 *Statistik:*`,
    `   W: ${wins} | L: ${losses} | Win Rate: ${winRate}%`,
    `   🏅 Total MVP Match: ${matchMvpCount}`,
  ];

  if (mvp.mvpScore && (mvp.mvpScore as number) > 0) {
    lines.push(`   🎯 Skor MVP: ${mvp.mvpScore}`);
  }

  lines.push("");
  lines.push("💡 Gunakan !statistik <nama> untuk detail lengkap.");

  return { command: "!mvp", reply: lines.join("\n") };
}

/**
 * !profil [nama] — Search and show a player's profile
 * Fuzzy search by name (case-insensitive, partial match).
 */
function cmdProfil(args: string): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!profil",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  if (!args.trim()) {
    return {
      command: "!profil",
      reply: [
        "❌ Format salah!",
        "",
        "Penggunaan: !profil <nama>",
        "",
        "Contoh: !profil Joko",
        'Contoh: !profil "Sari Indah"',
        "",
        "💡 Pencarian bersifat partial — cukup ketik sebagian nama.",
      ].join("\n"),
    };
  }

  const searchTerm = `%${args.trim()}%`;

  const users = safeQuery(
    `SELECT u.id, u.name, u.gender, u.tier, u.points, u.isMVP, u.phone,
            u.role, u.createdAt,
            COALESCE(r.wins, 0) as wins,
            COALESCE(r.losses, 0) as losses,
            r.rank as globalRank
     FROM User u
     LEFT JOIN Ranking r ON u.id = r.userId
     WHERE LOWER(u.name) LIKE LOWER(?)
     ORDER BY u.points DESC
     LIMIT 5`,
    [searchTerm]
  );

  if (users.length === 0) {
    return {
      command: "!profil",
      reply: [
        `❌ Pemain "${args.trim()}" tidak ditemukan.`,
        "",
        "💡 Pastikan nama sudah benar. Pencarian bersifat partial.",
        "💡 Coba gunakan nama yang lebih pendek atau berbeda.",
        "💡 Gunakan !pemain untuk melihat daftar semua pemain terdaftar.",
      ].join("\n"),
    };
  }

  // If multiple matches, show summary first
  if (users.length > 1) {
    const lines: string[] = [
      `🔍 Ditemukan ${users.length} pemain yang cocok:`,
      "",
    ];
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const genderIcon = (u.gender as string) === "female" ? "♀" : "♂";
      lines.push(`  ${i + 1}. ${u.name} ${genderIcon} — Tier ${u.tier} | ${u.points} pts`);
    }
    lines.push("");
    lines.push("💡 Ketik nama lengkap untuk melihat profil detail.");
    return { command: "!profil", reply: lines.join("\n") };
  }

  // Single match — show full profile
  const u = users[0];
  const userId = u.id as string;
  const genderIcon = (u.gender as string) === "female" ? "♀" : "♂";
  const genderLabel = (u.gender as string) === "female" ? "Female" : "Male";
  const tierIcon = getTierIcon(u.tier as string);
  const wins = u.wins as number;
  const losses = u.losses as number;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const mvpBadge = (u.isMVP as boolean) ? " 👑 *MVP*" : "";

  const lines: string[] = [
    `👤 *PROFIL PEMAIN*`,
    "─────────────────────",
    `${tierIcon} *${u.name}* ${genderIcon}${mvpBadge}`,
    `   🏓 Divisi: ${genderLabel}`,
    `   🏆 Poin: ${u.points}`,
    `   📊 W: ${wins} | L: ${losses} | Win Rate: ${winRate}%`,
    u.globalRank ? `   🏅 Peringkat: #${u.globalRank}` : "",
    `   📅 Bergabung: ${u.createdAt ? new Date(u.createdAt as string).toLocaleDateString("id-ID") : "-"}`,
  ];

  // Get team info
  const teams = safeQuery(
    `SELECT tm.name as teamName, tm.seed, t.name as tournamentName,
           tm.isEliminated, tm.eliminationType,
           tm2.role as teamRole
     FROM TeamMember tm2
     JOIN Team tm ON tm2.teamId = tm.id
     JOIN Tournament t ON tm.tournamentId = t.id
     WHERE tm2.userId = ?
     ORDER BY t.createdAt DESC`,
    [userId]
  );

  if (teams.length > 0) {
    lines.push("");
    lines.push(`👥 *TIM (${teams.length})*`);
    lines.push("─────────────────────");
    for (const team of teams) {
      const roleIcon = team.teamRole === "captain" ? "👑" : "🎮";
      const elim = (team.isEliminated as boolean)
        ? " [Keluar]"
        : "";
      lines.push(`  ${roleIcon} ${team.teamName} — Seed #${team.seed}${elim}`);
      lines.push(`     📍 ${team.tournamentName}`);
    }
  }

  // Get recent match history (last 5)
  const matchHistory = safeQuery(
    `SELECT m.matchNumber, m.round, m.scoreA, m.scoreB, m.status, m.bracket,
            m.teamAId, m.teamBId, m.winnerId, m.mvpId,
            tA.name as teamAName, tB.name as teamBName,
            w.name as winnerName,
            mvp.name as mvpName
     FROM TeamMember tm2
     JOIN Team tm ON tm2.teamId = tm.id
     JOIN Match m ON (m.teamAId = tm.id OR m.teamBId = tm.id)
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     LEFT JOIN Team w ON m.winnerId = w.id
     LEFT JOIN User mvp ON m.mvpId = mvp.id
     WHERE tm2.userId = ? AND m.status = 'completed'
     ORDER BY m.completedAt DESC
     LIMIT 5`,
    [userId]
  );

  if (matchHistory.length > 0) {
    lines.push("");
    lines.push(`📜 *RIWAYAT PERTANDINGAN (terbaru)*`);
    lines.push("─────────────────────");
    for (const m of matchHistory) {
      const isMvp = m.mvpId === userId;
      // Determine which team the player is on (A or B)
      const playerTeamId = m.teamAId === userId ? m.teamAId : m.teamBId;
      const isWin = m.winnerId === playerTeamId;
      const resultIcon = isWin ? "✅" : "❌";
      const mvpIcon = isMvp ? " ⭐" : "";

      lines.push(
        `  ${resultIcon} ${m.teamAName} ${m.scoreA}-${m.scoreB} ${m.teamBName}${mvpIcon}`
      );
    }
  }

  lines.push("");
  lines.push("💡 Gunakan !statistik <nama> untuk detail statistik lengkap.");

  return { command: "!profil", reply: lines.join("\n") };
}

/**
 * !statistik [nama] — Show detailed stats for a player
 * Wins, losses, win rate, MVP count, points earned.
 */
function cmdStatistik(args: string): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!statistik",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  if (!args.trim()) {
    return {
      command: "!statistik",
      reply: [
        "❌ Format salah!",
        "",
        "Penggunaan: !statistik <nama>",
        "",
        "Contoh: !statistik Joko",
        'Contoh: !statistik "Sari Indah"',
        "",
        "💡 Pencarian bersifat partial — cukup ketik sebagian nama.",
      ].join("\n"),
    };
  }

  const searchTerm = `%${args.trim()}%`;

  const user = safeGet(
    `SELECT u.id, u.name, u.gender, u.tier, u.points, u.isMVP, u.mvpScore,
            COALESCE(r.wins, 0) as wins,
            COALESCE(r.losses, 0) as losses
     FROM User u
     LEFT JOIN Ranking r ON u.id = r.userId
     WHERE LOWER(u.name) LIKE LOWER(?)
     ORDER BY u.points DESC
     LIMIT 1`,
    [searchTerm]
  );

  if (!user) {
    return {
      command: "!statistik",
      reply: [
        `❌ Pemain "${args.trim()}" tidak ditemukan.`,
        "",
        "💡 Pastikan nama sudah benar. Gunakan !pemain untuk melihat daftar pemain.",
      ].join("\n"),
    };
  }

  const userId = user.id as string;
  const genderIcon = (user.gender as string) === "female" ? "♀" : "♂";
  const tierIcon = getTierIcon(user.tier as string);

  // MVP match count (how many times this player was named MVP)
  const mvpMatchRow = safeGet(
    `SELECT COUNT(*) as count FROM Match WHERE mvpId = ?`,
    [userId]
  );
  const mvpMatchCount = (mvpMatchRow?.count as number) || 0;

  // Team match stats (via TeamMember → Team → Match)
  const teamStats = safeQuery(
    `SELECT m.status, m.winnerId,
            tm.id as playerTeamId,
            t.name as tournamentName
     FROM TeamMember tm2
     JOIN Team tm ON tm2.teamId = tm.id
     JOIN Match m ON (m.teamAId = tm.id OR m.teamBId = tm.id)
     JOIN Tournament t ON m.tournamentId = t.id
     WHERE tm2.userId = ? AND m.status = 'completed'`,
    [userId]
  );

  let teamWins = 0;
  let teamLosses = 0;
  let tournamentsPlayed = new Set<string>();

  for (const match of teamStats) {
    tournamentsPlayed.add(match.tournamentName as string);
    if (match.winnerId === match.playerTeamId) {
      teamWins++;
    } else {
      teamLosses++;
    }
  }

  const teamTotal = teamWins + teamLosses;
  const teamWinRate = teamTotal > 0 ? Math.round((teamWins / teamTotal) * 100) : 0;

  // Points earned from matches (individual PlayerMatchStat)
  const statRow = safeGet(
    `SELECT COALESCE(SUM(pms.score), 0) as totalKills,
            COUNT(*) as matchesPlayed
     FROM PlayerMatchStat pms
     WHERE pms.userId = ?`,
    [userId]
  );
  const totalKills = (statRow?.totalKills as number) || 0;
  const matchesPlayedStat = (statRow?.matchesPlayed as number) || 0;

  // Average score per match
  const avgScore = matchesPlayedStat > 0
    ? (totalKills / matchesPlayedStat).toFixed(1)
    : "0";

  const globalWins = user.wins as number;
  const globalLosses = user.losses as number;
  const globalTotal = globalWins + globalLosses;
  const globalWinRate = globalTotal > 0 ? Math.round((globalWins / globalTotal) * 100) : 0;

  const lines: string[] = [
    `📊 *STATISTIK PEMAIN*`,
    "─────────────────────",
    `${tierIcon} *${user.name}* ${genderIcon}${(user.isMVP as boolean) ? " 👑 MVP" : ""}`,
    "",
    `📈 *Peringkat Global:*`,
    `   W: ${globalWins} | L: ${globalLosses} | Win Rate: ${globalWinRate}%`,
    `   🏆 Poin: ${user.points}`,
    "",
    `⚔️ *Statistik Tim:*`,
    `   Menang: ${teamWins} | Kalah: ${teamLosses} | Win Rate: ${teamWinRate}%`,
    `   Turnamen: ${tournamentsPlayed.size} turnamen`,
    "",
    `🎯 *Performa Individu:*`,
    `   🎮 Match dimainkan: ${matchesPlayedStat}`,
    `   💥 Total Kills/Skor: ${totalKills}`,
    `   📊 Rata-rata per match: ${avgScore}`,
    "",
    `🏅 *MVP:*`,
    `   🏅 Jumlah MVP: ${mvpMatchCount} kali`,
    user.mvpScore && (user.mvpScore as number) > 0
      ? `   🎯 Skor MVP terakhir: ${user.mvpScore}`
      : "",
  ];

  // Best tournament performance
  if (tournamentsPlayed.size > 0) {
    lines.push("");
    lines.push(`📍 *Turnamen Dimainkan:*`);
    for (const tName of tournamentsPlayed) {
      lines.push(`   • ${tName}`);
    }
  }

  lines.push("");
  lines.push("💡 Gunakan !profil <nama> untuk info lengkap pemain.");

  return { command: "!statistik", reply: lines.join("\n") };
}

/**
 * !grup — Show group stage standings
 * From matches where bracket='group', calculate W/L/pointDiff per team.
 */
function cmdGrup(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!grup",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  // Find tournament with group bracket
  const tournament = safeGet(
    `SELECT t.id, t.name, t.division
     FROM Tournament t
     WHERE t.bracketType = 'group'
       AND t.id IN (SELECT DISTINCT tournamentId FROM Match WHERE bracket = 'group')
     ORDER BY t.createdAt DESC LIMIT 1`
  );

  if (!tournament) {
    return {
      command: "!grup",
      reply: [
        "📋 Tidak ada babak grup yang tersedia saat ini.",
        "",
        "💡 Babak grup hanya tersedia pada turnamen dengan format 'group stage'.",
        "💡 Gunakan !bracket untuk melihat bracket eliminasi.",
      ].join("\n"),
    };
  }

  // Get all group matches
  const groupMatches = safeQuery(
    `SELECT m.id, m.round, m.matchNumber, m.scoreA, m.scoreB, m.status,
            tA.id as teamAId, tA.name as teamAName,
            tB.id as teamBId, tB.name as teamBName,
            w.id as winnerId
     FROM Match m
     JOIN Tournament t ON m.tournamentId = t.id
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     LEFT JOIN Team w ON m.winnerId = w.id
     WHERE m.tournamentId = ? AND m.bracket = 'group'
     ORDER BY m.round ASC, m.matchNumber ASC`,
    [tournament.id]
  );

  if (groupMatches.length === 0) {
    return {
      command: "!grup",
      reply: `📋 Turnamen "${tournament.name}" belum memiliki pertandingan babak grup.\n\n💡 Admin perlu generate bracket terlebih dahulu.`,
    };
  }

  // Calculate standings per team
  const standings = new Map<string, {
    teamId: string;
    name: string;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
  }>();

  for (const match of groupMatches) {
    if (match.status !== "completed") continue;

    const teamAId = match.teamAId as string;
    const teamBId = match.teamBId as string;
    const teamAName = match.teamAName as string;
    const teamBName = match.teamBName as string;
    const scoreA = (match.scoreA as number) || 0;
    const scoreB = (match.scoreB as number) || 0;
    const winnerId = match.winnerId as string | null;

    // Initialize if needed
    if (!standings.has(teamAId)) {
      standings.set(teamAId, { teamId: teamAId, name: teamAName, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    }
    if (!standings.has(teamBId)) {
      standings.set(teamBId, { teamId: teamBId, name: teamBName, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    }

    const a = standings.get(teamAId)!;
    const b = standings.get(teamBId)!;

    a.pointsFor += scoreA;
    a.pointsAgainst += scoreB;
    b.pointsFor += scoreB;
    b.pointsAgainst += scoreA;

    if (winnerId === teamAId) {
      a.wins++;
      b.losses++;
    } else if (winnerId === teamBId) {
      b.wins++;
      a.losses++;
    }
  }

  // Sort: wins desc, then pointDiff desc, then pointsFor desc
  const sortedTeams = [...standings.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    return b.pointsFor - a.pointsFor;
  });

  // Determine how many qualify (top 2 per group, assuming 2 groups of ~4)
  const completedMatches = groupMatches.filter((m) => m.status === "completed");
  const pendingMatches = groupMatches.filter((m) => m.status !== "completed");

  const lines: string[] = [
    `📊 *KLASEMEN BABAK GRUP*`,
    `📍 ${tournament.name}`,
    "",
    "┌─────┬──────────────────────┬───┬───┬───┬──────┐",
    "│ #   │ Tim                  │ W │ L │ +/− │ Pts  │",
    "├─────┼──────────────────────┼───┼───┼─────┼──────┤",
  ];

  // Mark top 2 as qualified (if we have enough teams)
  const qualifiedCount = sortedTeams.length >= 4 ? 2 : sortedTeams.length >= 2 ? 1 : 0;

  for (let i = 0; i < sortedTeams.length; i++) {
    const t = sortedTeams[i];
    const rank = i + 1;
    const pointDiff = t.pointsFor - t.pointsAgainst;
    const diffStr = pointDiff >= 0 ? `+${pointDiff}` : `${pointDiff}`;
    const isQualified = i < qualifiedCount;
    const qualIcon = isQualified ? "✅" : "  ";

    const nameStr = t.name.length > 18 ? t.name.substring(0, 16) + ".." : t.name;
    lines.push(
      `│ ${qualIcon} ${String(rank).padEnd(2)} │ ${nameStr.padEnd(20)} │ ${String(t.wins).padStart(1)} │ ${String(t.losses).padStart(1)} │ ${diffStr.padStart(4)} │ ${String(t.pointsFor).padStart(4)} │`
    );
  }

  lines.push("└─────┴──────────────────────┴───┴───┴─────┴──────┘");

  if (qualifiedCount > 0) {
    lines.push(`\n✅ Top ${qualifiedCount} lolos ke babak playoff`);
  }

  if (pendingMatches.length > 0) {
    lines.push(`\n⏳ ${pendingMatches.length} pertandingan belum selesai`);
  }

  if (completedMatches.length === 0) {
    lines.push("");
    lines.push("⚠️ Belum ada pertandingan yang selesai di babak grup.");
    lines.push("💡 Klasemen akan diperbarui setelah pertandingan selesai.");
  }

  lines.push("");
  lines.push("💡 Gunakan !bracket untuk melihat bracket lengkap.");

  return { command: "!grup", reply: lines.join("\n") };
}

/**
 * !nextmatch — Show the next upcoming match
 * Earliest pending match by scheduledAt or matchNumber.
 */
function cmdNextmatch(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!nextmatch",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  // Find the next pending match: first with scheduledAt, then by matchNumber
  const nextMatch = safeGet(
    `SELECT m.id, m.round, m.matchNumber, m.bracket,
            m.scheduledAt,
            t.name as tournamentName, t.division, t.bracketType as tBracketType,
            tA.name as teamAName, tA.seed as seedA,
            tB.name as teamBName, tB.seed as seedB
     FROM Match m
     JOIN Tournament t ON m.tournamentId = t.id
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     WHERE m.status = 'pending'
     ORDER BY
       CASE WHEN m.scheduledAt IS NOT NULL THEN 0 ELSE 1 END,
       m.scheduledAt ASC,
       m.matchNumber ASC
     LIMIT 1`
  );

  // Also check for ongoing match
  const liveMatch = safeGet(
    `SELECT m.id, m.round, m.matchNumber, m.bracket,
            m.scoreA, m.scoreB, m.scheduledAt,
            t.name as tournamentName, t.division,
            tA.name as teamAName,
            tB.name as teamBName
     FROM Match m
     JOIN Tournament t ON m.tournamentId = t.id
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     WHERE m.status = 'ongoing'
     ORDER BY m.scheduledAt ASC
     LIMIT 1`
  );

  if (!nextMatch && !liveMatch) {
    // Check if tournament is completed
    const latestTournament = safeGet(
      `SELECT t.id, t.name, t.status FROM Tournament t ORDER BY t.createdAt DESC LIMIT 1`
    );

    if (latestTournament && (latestTournament.status as string) === "completed") {
      return {
        command: "!nextmatch",
        reply: [
          `🏆 Turnamen "${latestTournament.name}" sudah selesai!`,
          "",
          "💡 Gunakan !hasil untuk melihat hasil pertandingan.",
          "💡 Gunakan !peringkat untuk melihat peringkat akhir.",
        ].join("\n"),
      };
    }

    return {
      command: "!nextmatch",
      reply: [
        "📋 Tidak ada pertandingan yang dijadwalkan.",
        "",
        "💡 Gunakan !status untuk melihat status turnamen.",
        "💡 Gunakan !jadwal untuk melihat semua jadwal pertandingan.",
      ].join("\n"),
    };
  }

  const lines: string[] = ["🏟️ *PERTANDINGAN SELANJUTNYA*\n"];

  if (liveMatch) {
    lines.push("🔴 *SEDANG BERLANGSUNG!*");
    lines.push("");
    lines.push(`  🔴 *${liveMatch.teamAName || "TBD"}* ${liveMatch.scoreA ?? 0} - ${liveMatch.scoreB ?? 0} *${liveMatch.teamBName || "TBD"}*`);
    lines.push(`  📍 ${liveMatch.tournamentName}`);
    lines.push(`  🏷️ Round ${liveMatch.round}${liveMatch.bracket ? ` [${liveMatch.bracket}]` : ""}`);
    lines.push("");
    lines.push("💡 Gunakan !jadwal untuk pertandingan selanjutnya setelah ini.");
  }

  if (nextMatch) {
    if (liveMatch) {
      lines.push("");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("");
    }

    const teamALabel = nextMatch.teamAName
      ? `*${nextMatch.teamAName}*${nextMatch.seedA ? ` (#${nextMatch.seedA})` : ""}`
      : "*TBD*";
    const teamBLabel = nextMatch.teamBName
      ? `*${nextMatch.teamBName}*${nextMatch.seedB ? ` (#${nextMatch.seedB})` : ""}`
      : "*TBD*";

    lines.push("⏳ *PERTANDINGAN BERIKUTNYA*");
    lines.push("");
    lines.push(`  ⏳ ${teamALabel}`);
    lines.push("     VS");
    lines.push(`  ⏳ ${teamBLabel}`);
    lines.push("");
    lines.push(`  📍 Turnamen: ${nextMatch.tournamentName}`);
    lines.push(`  🏷️ Round ${nextMatch.round} | Match #${nextMatch.matchNumber}${nextMatch.bracket ? ` [${nextMatch.bracket}]` : ""}`);

    if (nextMatch.scheduledAt) {
      lines.push(`  🕐 ${formatDateTime(nextMatch.scheduledAt as string)}`);
    } else {
      lines.push(`  🕐 Waktu belum ditentukan`);
    }
  }

  lines.push("");
  lines.push("💡 Gunakan !jadwal untuk semua jadwal, !bracket untuk bracket lengkap.");

  return { command: "!nextmatch", reply: lines.join("\n") };
}

/**
 * !topdonasi — Show top 10 donors
 * From Donation table, ordered by amount desc.
 */
function cmdTopdonasi(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!topdonasi",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  const donors = safeQuery(
    `SELECT d.id, d.userId, d.amount, d.message, d.anonymous, d.paymentStatus, d.createdAt,
            u.name as userName
     FROM Donation d
     LEFT JOIN User u ON d.userId = u.id
     WHERE d.paymentStatus = 'confirmed'
     ORDER BY d.amount DESC
     LIMIT 10`
  );

  if (donors.length === 0) {
    return {
      command: "!topdonasi",
      reply: [
        "📋 Belum ada donasi yang terkonfirmasi.",
        "",
        "💡 Gunakan !donasi <jumlah> [pesan] untuk berdonasi ke Season 2.",
        "💡 Donasi akan muncul di sini setelah dikonfirmasi admin.",
      ].join("\n"),
    };
  }

  // Get total for context
  const totalRow = safeGet(
    `SELECT COALESCE(SUM(amount), 0) as total FROM Donation WHERE paymentStatus = 'confirmed'`
  );
  const total = (totalRow?.total as number) || 0;

  const lines: string[] = [
    "💝 *TOP 10 DONATUR - SEASON 2*",
    `📊 Total terkumpul: ${formatMoney(total)}`,
    "",
  ];

  const medals = ["🥇", "🥈", "🥉"];

  for (let i = 0; i < donors.length; i++) {
    const d = donors[i];
    const rank = medals[i] || `${String(i + 1).padStart(2, " ")}.`;
    const name = (d.anonymous as boolean) ? "🙈 Anonymous" : (d.userName || "👤 Unknown");
    const amount = d.amount as number;
    const date = d.createdAt ? new Date(d.createdAt as string).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "";

    lines.push(`${rank} *${name}*`);
    lines.push(`   💰 ${formatMoney(amount)}${date ? ` | 📅 ${date}` : ""}`);
    if (d.message) {
      lines.push(`   💬 "${d.message}"`);
    }
    lines.push("");
  }

  lines.push("🙏 Terima kasih kepada semua donatur!");
  lines.push("💡 Gunakan !donasi <jumlah> [pesan] untuk berdonasi.");

  return { command: "!topdonasi", reply: lines.join("\n") };
}

/**
 * !topsawer — Show top 10 sawer senders
 * From Sawer table, ordered by amount desc.
 */
function cmdTopsawer(): CommandResult {
  if (!isDbAvailable()) {
    return {
      command: "!topsawer",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  const sawerList = safeQuery(
    `SELECT s.id, s.senderName, s.targetPlayerName, s.amount, s.message, s.paymentStatus, s.createdAt
     FROM Sawer s
     WHERE s.paymentStatus = 'confirmed'
     ORDER BY s.amount DESC
     LIMIT 10`
  );

  if (sawerList.length === 0) {
    return {
      command: "!topsawer",
      reply: [
        "📋 Belum ada sawer yang terkonfirmasi.",
        "",
        "💡 Gunakan !sawer <jumlah> [pesan] untuk memberikan sawer.",
        "💡 Sawer akan muncul di sini setelah dikonfirmasi admin.",
      ].join("\n"),
    };
  }

  // Get total for context
  const totalRow = safeGet(
    `SELECT COALESCE(SUM(amount), 0) as total FROM Sawer WHERE paymentStatus = 'confirmed'`
  );
  const total = (totalRow?.total as number) || 0;

  // Aggregate by sender
  const senderTotals = new Map<string, { name: string; total: number; count: number }>();
  for (const s of sawerList) {
    const name = (s.senderName as string) || "Unknown";
    const existing = senderTotals.get(name);
    if (existing) {
      existing.total += (s.amount as number);
      existing.count++;
    } else {
      senderTotals.set(name, { name, total: s.amount as number, count: 1 });
    }
  }

  // Sort by total desc
  const sorted = [...senderTotals.values()].sort((a, b) => b.total - a.total);

  const lines: string[] = [
    "💸 *TOP 10 SAWER*",
    `📊 Total sawer terkumpul: ${formatMoney(total)}`,
    "",
  ];

  const medals = ["🥇", "🥈", "🥉"];

  for (let i = 0; i < sorted.length && i < 10; i++) {
    const s = sorted[i];
    const rank = medals[i] || `${String(i + 1).padStart(2, " ")}.`;

    lines.push(`${rank} *${s.name}*`);
    lines.push(`   💰 ${formatMoney(s.total)} | 📝 ${s.count}x sawer`);
    lines.push("");
  }

  lines.push("🙏 Terima kasih kepada semua yang sudah sawer!");
  lines.push("💡 Gunakan !sawer <jumlah> [pesan] untuk memberikan sawer.");

  return { command: "!topsawer", reply: lines.join("\n") };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND HANDLERS (Async — API calls to main app)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * !daftar <nama> [divisi] — Register for tournament
 * Phone number is auto-captured from the sender's WhatsApp number.
 * Creates a user (if new) then registers them for the latest tournament.
 * Duplicate check: uses WhatsApp JID as primary identifier (handles @lid vs @s.whatsapp.net)
 */
async function cmdDaftar(args: string, senderPhone: string, senderJid: string): Promise<CommandResult> {
  if (!senderPhone && !senderJid) {
    return {
      command: "!daftar",
      reply: "❌ Gagal mendeteksi nomor WhatsApp Anda. Pastikan pesan dikirim langsung dari akun WhatsApp Anda.",
    };
  }

  const tokens = parseArgs(args, 10);

  if (tokens.length < 1) {
    return {
      command: "!daftar",
      reply: [
        "❌ Format salah!",
        "",
        "Penggunaan: !daftar <nama> [divisi] [club]",
        "",
        "Divisi: male / female (default: male)",
        "",
        "Contoh: !daftar Joko",
        "Contoh: !daftar Sari female",
        'Contoh: !daftar "Joko Susanto"',
        "Contoh: !daftar Joko male NEXUS",
        "",
        "📱 Nomor HP Anda terdeteksi otomatis dari WhatsApp.",
      ].join("\n"),
    };
  }

  // Parse name (may be quoted with spaces), optional division, and optional club
  const name = tokens[0];
  let club: string | undefined;
  let divArg: string;

  if (tokens.length >= 3) {
    // Club is the last argument, division is the second-to-last
    club = tokens[tokens.length - 1];
    divArg = tokens[tokens.length - 2].toLowerCase();
  } else if (tokens.length === 2) {
    // No club, division is the last argument
    divArg = tokens[1].toLowerCase();
  } else {
    // Only name provided, default to male
    divArg = "male";
  }

  const gender = (divArg === "female" || divArg === "f" || divArg === "perempuan") ? "female" : "male";
  const genderLabel = gender === "female" ? "Female" : "Male";

  if (name.length < 2) {
    return {
      command: "!daftar",
      reply: "❌ Nama terlalu pendek. Minimal 2 karakter.\n\n💡 Contoh: !daftar Joko",
    };
  }

  if (name.length > 50) {
    return {
      command: "!daftar",
      reply: "❌ Nama terlalu panjang. Maksimal 50 karakter.\n\n💡 Gunakan nama panggilan yang lebih pendek.",
    };
  }

  console.log(
    `[WhatsApp Bot] !daftar → jid="${senderJid}", phone="${senderPhone}", name="${name}", gender="${gender}"${club ? `, club="${club}"` : ""}`
  );

  // PRIORITY 1: Check by WhatsApp JID first (most reliable - handles @lid vs @s.whatsapp.net)
  if (senderJid) {
    const existingByJid = safeGet(
      `SELECT id, name, phone, email, gender as existingGender, tier, whatsappJid FROM User WHERE whatsappJid = ?`,
      [senderJid]
    );

    if (existingByJid) {
      console.log(`[WhatsApp Bot] !daftar → Found user by JID: ${senderJid} -> ${existingByJid.name}`);
      return handleExistingUser(existingByJid, senderPhone, senderJid);
    }
  }

  // PRIORITY 2: Check by phone number (fallback for existing data)
  if (senderPhone) {
    const existingByPhone = safeGet(
      `SELECT id, name, phone, email, gender as existingGender, tier, whatsappJid FROM User WHERE phone = ?`,
      [senderPhone]
    );

    if (existingByPhone) {
      console.log(`[WhatsApp Bot] !daftar → Found user by phone: ${senderPhone} -> ${existingByPhone.name}`);
      // ALWAYS update JID to current one (JID can change between @s.whatsapp.net and @lid)
      // This ensures we always have the latest JID for future lookups
      if (senderJid && existingByPhone.whatsappJid !== senderJid) {
        await putToMainApp("api/users", {
          userId: existingByPhone.id,
          whatsappJid: senderJid,
        });
        console.log(`[WhatsApp Bot] !daftar → Updated JID for user ${existingByPhone.name}: ${existingByPhone.whatsappJid || "none"} → ${senderJid}`);
      }
      return handleExistingUser(existingByPhone, senderPhone, senderJid);
    }
  }

  // PRIORITY 3: Check if name already exists in the same division
  const existingByName = safeGet(
    `SELECT id, name, phone, email, gender as existingGender, tier, whatsappJid FROM User
     WHERE LOWER(name) = LOWER(?) AND gender = ?`,
    [name, gender]
  );

  if (existingByName) {
    const userId = existingByName.id as string;
    const existingName = existingByName.name as string;
    const existingPhone = existingByName.phone as string | null;
    const existingJid = existingByName.whatsappJid as string | null;

    console.log(
      `[WhatsApp Bot] !daftar → Name match found: id=${userId}, name="${existingName}", phone="${existingPhone || "none"}", jid="${existingJid || "none"}"`
    );

    // Case A: Existing user has NO phone/JID — link this WhatsApp to their account
    if (!existingPhone && !existingJid) {
      console.log(`[WhatsApp Bot] !daftar → Linking phone ${senderPhone} and JID ${senderJid} to existing user id=${userId}`);

      // Update user phone and JID via API
      await putToMainApp("api/users", {
        userId,
        phone: senderPhone,
        whatsappJid: senderJid,
      });

      // Check their registration status
      const existingReg = safeGet(
        `SELECT r.id, r.status, r.tierAssigned, t.name as tournamentName, t.division
         FROM Registration r
         JOIN Tournament t ON r.tournamentId = t.id
         WHERE r.userId = ?
         ORDER BY r.createdAt DESC LIMIT 1`,
        [userId]
      );

      if (existingReg) {
        const regStatus = existingReg.status as string;
        const tournamentName = existingReg.tournamentName as string;
        const regDivision = existingReg.division as string;

        return {
          command: "!daftar",
          reply: [
            `✅ Akun Anda berhasil ditemukan!`,
            "",
            `👤 Nama: ${existingName}`,
            `🏅 Tier: (admin yang akan input)`,
            `📍 Turnamen: ${tournamentName}`,
            `📊 Status pendaftaran: ${statusLabel(regStatus)}`,
            `🏓 Divisi: ${regDivision === "female" ? "Female" : "Male"}`,
            "",
            regStatus === "pending"
              ? "⏳ Pendaftaran Anda masih menunggu persetujuan admin."
              : regStatus === "approved"
                ? "✅ Pendaftaran Anda sudah disetujui admin!"
                : "❌ Pendaftaran Anda ditolak. Hubungi admin untuk info lebih lanjut.",
            "",
            `💡 Gunakan !akun untuk melihat info lengkap.`,
          ].join("\n"),
        };
      }

      // Name exists but no registration yet — register them
      const tournament = safeGet(
        `SELECT id, name, division, status FROM Tournament
         WHERE division = ?
         ORDER BY createdAt DESC LIMIT 1`,
        [existingByName.existingGender]
      );

      if (!tournament) {
        return {
          command: "!daftar",
          reply: [
            `✅ Akun Anda berhasil ditemukan!`,
            `👤 Nama: ${existingName}`,
            "",
            `⚠️ Tidak ada turnamen yang tersedia untuk divisi ${genderLabel} saat ini.`,
            "",
            `Tunggu turnamen dibuka dan coba !daftar lagi.`,
          ].join("\n"),
        };
      }

      const regResult = await postToMainApp("api/tournaments/register", {
        userId,
        tournamentId: tournament.id,
      });

      if (!regResult.ok) {
        const errData = regResult.data as { error?: string } | undefined;
        return {
          command: "!daftar",
          reply: `❌ Gagal mendaftar ke turnamen: ${errData?.error || "Kesalahan server"}\n\n💡 Pastikan turnamen sedang dalam fase registrasi.`,
        };
      }

      return {
        command: "!daftar",
        reply: [
          `✅ Pendaftaran berhasil!`,
          `👤 Nama: ${existingName}`,
          `🏅 Tier: (admin yang akan input)`,
          `📍 Turnamen: ${tournament.name}`,
          `📊 Status: Menunggu persetujuan admin`,
          "",
          `⏳ Tunggu admin menyetujui pendaftaran Anda.`,
          `💡 Gunakan !akun untuk cek status pendaftaran.`,
        ].join("\n"),
      };
    }

    // Case B: Existing user already HAS different phone/JID — possible impersonation
    console.log(
      `[WhatsApp Bot] !daftar → Name "${name}" already registered with different identifiers`
    );

    return {
      command: "!daftar",
      reply: [
        `⚠️ Nama "${existingName}" sudah terdaftar.`,
        "",
        `👤 Nama di sistem: ${existingName}`,
        `🏅 Tier: (admin yang akan input)`,
        "",
        `ℹ️ Jika Anda adalah pemilik akun ini, hubungi admin.`,
        `ℹ️ Jika Anda bukan orang yang sama, gunakan nama lain untuk mendaftar.`,
        "",
        `💡 Contoh: !daftar "${name} 2" ${gender}`,
        `💡 Atau gunakan nama panggilan yang berbeda.`,
      ].join("\n"),
    };
  }

  // Step 3: Completely new user — create account with phone number and JID
  const createBody: Record<string, unknown> = {
    name,
    phone: senderPhone,
    whatsappJid: senderJid,
    gender,
  };
  if (club) {
    createBody.club = club;
  }

  const createResult = await postToMainApp("api/users", createBody);

  if (!createResult.ok) {
    const errData = createResult.data as { error?: string } | undefined;
    const errorMsg = errData?.error || "Gagal membuat akun";
    return {
      command: "!daftar",
      reply: `❌ Gagal mendaftar: ${errorMsg}\n\n💡 Silakan coba lagi atau hubungi admin.`,
    };
  }

  const userData = createResult.data as { user?: { id: string; name: string } };
  const userId = userData?.user?.id;

  if (!userId) {
    return {
      command: "!daftar",
      reply: "❌ Gagal membuat akun. Silakan coba lagi.\n\n💡 Jika masalah berlanjut, hubungi admin.",
    };
  }

  console.log(
    `[WhatsApp Bot] !daftar → New user created: id=${userId}, name="${name}", phone="${senderPhone}", jid="${senderJid}"${club ? `, club="${club}"` : ""}`
  );

  // Step 4: Find latest tournament for the user's gender
  const tournament = safeGet(
    `SELECT id, name, division, status FROM Tournament
     WHERE division = ?
     ORDER BY createdAt DESC LIMIT 1`,
    [gender]
  );

  if (!tournament) {
    return {
      command: "!daftar",
      reply: [
        `✅ Akun berhasil dibuat!`,
        `👤 Nama: ${name}`,
        `🏅 Tier: (admin yang akan input)`,
        `🏓 Divisi: ${genderLabel}`,
        "",
        `⚠️ Tidak ada turnamen yang tersedia untuk divisi ${genderLabel} saat ini.`,
        "",
        `Tunggu turnamen dibuka dan coba !daftar lagi.`,
      ].join("\n"),
    };
  }

  // Step 5: Register for tournament
  console.log(
    `[WhatsApp Bot] !daftar → Registering to tournament: ${tournament.id} (${tournament.name})`
  );

  const regResult = await postToMainApp("api/tournaments/register", {
    userId,
    tournamentId: tournament.id,
  });

  if (!regResult.ok) {
    const errData = regResult.data as { error?: string } | undefined;
    const errorMsg = errData?.error || "Gagal mendaftar ke turnamen";
    return {
      command: "!daftar",
      reply: [
        `✅ Akun berhasil dibuat!`,
        `👤 Nama: ${name}`,
        "",
        `❌ Gagal mendaftar ke turnamen: ${errorMsg}`,
        "",
        `💡 Pastikan turnamen sedang dalam fase registrasi.`,
      ].join("\n"),
    };
  }

  return {
    command: "!daftar",
    reply: [
      `✅ Pendaftaran berhasil!`,
      `👤 Nama: ${name}`,
      `🏅 Tier: (admin yang akan input)`,
      `🏓 Divisi: ${genderLabel}`,
      club ? `🏟️ Club: ${club}` : "",
      `📍 Turnamen: ${tournament.name}`,
      `📊 Status pendaftaran: ⏳ Menunggu`,
      "",
      `⏳ Pendaftaran Anda masih menunggu persetujuan admin.`,
      "",
      `💡 Gunakan !akun untuk melihat info lengkap.`,
    ].filter(Boolean).join("\n"),
  };
}

/**
 * Helper: Handle existing user registration check
 * Also updates phone/JID if user was registered with only Lid ID and now has real phone
 */
async function handleExistingUser(
  existingUser: DbRow,
  senderPhone: string,
  senderJid: string
): Promise<CommandResult> {
  const userId = existingUser.id as string;
  const existingName = existingUser.name as string;
  const existingGender = existingUser.existingGender as string;
  const existingPhone = existingUser.phone as string | null;
  const existingJid = existingUser.whatsappJid as string | null;

  // Update phone if user had no phone (Lid ID case) and we now have a real phone
  if (senderPhone && !existingPhone) {
    console.log(`[WhatsApp Bot] handleExistingUser → Updating phone for user ${existingName}: none → ${senderPhone}`);
    await putToMainApp("api/users", {
      userId,
      phone: senderPhone,
    });
  }

  // Update JID if we have a new one
  if (senderJid && existingJid !== senderJid) {
    console.log(`[WhatsApp Bot] handleExistingUser → Updating JID for user ${existingName}: ${existingJid || "none"} → ${senderJid}`);
    await putToMainApp("api/users", {
      userId,
      whatsappJid: senderJid,
    });
  }

  // Check if already registered in any tournament
  const existingReg = safeGet(
    `SELECT r.id, r.status, r.tierAssigned, t.name as tournamentName, t.division, t.status as tournamentStatus
     FROM Registration r
     JOIN Tournament t ON r.tournamentId = t.id
     WHERE r.userId = ?
     ORDER BY r.createdAt DESC LIMIT 1`,
    [userId]
  );

  if (existingReg) {
    const regStatus = existingReg.status as string;
    const tournamentName = existingReg.tournamentName as string;
    const regDivision = existingReg.division as string;

    return {
      command: "!daftar",
      reply: [
        `ℹ️ Nomor WhatsApp Anda sudah terdaftar.`,
        "",
        `👤 Nama: ${existingName}`,
        `🏅 Tier: (admin yang akan input)`,
        `📍 Turnamen: ${tournamentName}`,
        `📊 Status pendaftaran: ${statusLabel(regStatus)}`,
        `🏓 Divisi: ${regDivision === "female" ? "Female" : "Male"}`,
        "",
        regStatus === "pending"
          ? "⏳ Pendaftaran Anda masih menunggu persetujuan admin."
          : regStatus === "approved"
            ? "✅ Pendaftaran Anda sudah disetujui admin!"
            : "❌ Pendaftaran Anda ditolak. Hubungi admin untuk info lebih lanjut.",
        "",
        `💡 Gunakan !akun untuk melihat info lengkap.`,
      ].join("\n"),
    };
  }

  // User exists but not registered in any tournament — register them
  const tournament = safeGet(
    `SELECT id, name, division, status FROM Tournament
     WHERE division = ?
     ORDER BY createdAt DESC LIMIT 1`,
    [existingGender]
  );

  if (!tournament) {
    return {
      command: "!daftar",
      reply: [
        `ℹ️ Akun Anda sudah terdaftar:`,
        `👤 Nama: ${existingName}`,
        "",
        `⚠️ Tidak ada turnamen yang tersedia untuk divisi ${existingGender === "female" ? "Female" : "Male"} saat ini.`,
        "",
        `Tunggu turnamen dibuka dan coba lagi.`,
      ].join("\n"),
    };
  }

  const regResult = await postToMainApp("api/tournaments/register", {
    userId,
    tournamentId: tournament.id,
  });

  if (!regResult.ok) {
    const errData = regResult.data as { error?: string } | undefined;
    const errorMsg = errData?.error || "Gagal mendaftar ke turnamen";
    return {
      command: "!daftar",
      reply: `❌ Gagal mendaftar ke turnamen: ${errorMsg}\n\n💡 Pastikan turnamen sedang dalam fase registrasi.`,
    };
  }

  return {
    command: "!daftar",
    reply: [
      `✅ Pendaftaran berhasil!`,
      `👤 Nama: ${existingName}`,
      `🏅 Tier: (admin yang akan input)`,
      `📍 Turnamen: ${tournament.name}`,
      `📊 Status: Menunggu persetujuan admin`,
      "",
      `⏳ Tunggu admin menyetujui pendaftaran Anda.`,
      `💡 Gunakan !akun untuk cek status pendaftaran.`,
    ].join("\n"),
  };
}

/**
 * !akun — Check account & registration info
 * Uses sender's WhatsApp JID (primary) or phone number to look up their account.
 */
async function cmdAkun(senderPhone: string, senderJid: string): Promise<CommandResult> {
  if (!senderPhone && !senderJid) {
    return {
      command: "!akun",
      reply: "❌ Gagal mendeteksi nomor WhatsApp Anda.\n\n💡 Pastikan pesan dikirim langsung dari akun WhatsApp Anda.",
    };
  }

  if (!isDbAvailable()) {
    return {
      command: "!akun",
      reply: "⚠️ Database tidak tersedia saat ini. Coba lagi nanti.",
    };
  }

  // PRIORITY 1: Check by JID first (most reliable)
  let user = senderJid ? safeGet(
    `SELECT id, name, phone, email, gender, tier, points, createdAt, whatsappJid FROM User WHERE whatsappJid = ?`,
    [senderJid]
  ) : null;

  // PRIORITY 2: Fall back to phone check
  if (!user && senderPhone) {
    user = safeGet(
      `SELECT id, name, phone, email, gender, tier, points, createdAt, whatsappJid FROM User WHERE phone = ?`,
      [senderPhone]
    );
    
    // Update JID if we found user by phone but no JID stored
    if (user && senderJid && !user.whatsappJid) {
      await putToMainApp("api/users", {
        userId: user.id,
        whatsappJid: senderJid,
      });
      console.log(`[WhatsApp Bot] !akun → Updated JID for user ${user.name}`);
    }
  }

  if (!user) {
    return {
      command: "!akun",
      reply: [
        `❌ Akun tidak ditemukan.`,
        "",
        `Anda belum terdaftar. Gunakan !daftar <nama> [divisi] untuk mendaftar.`,
        "",
        "Contoh: !daftar Joko",
        "Contoh: !daftar Sari female",
      ].join("\n"),
    };
  }

  const userId = user.id as string;
  const genderIcon = (user.gender as string) === "female" ? "♀" : "♂";
  const genderLabel = (user.gender as string) === "female" ? "Female" : "Male";
  const tierIcon = getTierIcon(user.tier as string);

  // Get registrations
  const registrations = safeQuery(
    `SELECT r.status, r.tierAssigned, r.createdAt,
            t.name as tournamentName, t.division, t.status as tournamentStatus
     FROM Registration r
     JOIN Tournament t ON r.tournamentId = t.id
     WHERE r.userId = ?
     ORDER BY r.createdAt DESC`,
    [userId]
  );

  // Get team info
  const teams = safeQuery(
    `SELECT tm.name as teamName, tm.seed, t.name as tournamentName,
           tm.isEliminated, tm.eliminationType
     FROM TeamMember tm2
     JOIN Team tm ON tm2.teamId = tm.id
     JOIN Tournament t ON tm.tournamentId = t.id
     WHERE tm2.userId = ?`,
    [userId]
  );

  const lines: string[] = [
    `👤 *INFO AKUN*`,
    "─────────────────────",
    `👤 Nama: ${user.name} ${genderIcon}`,
    `🏅 Tier: (admin yang akan input)`,
    `🏆 Poin: ${user.points || 0}`,
    `📅 Bergabung: ${user.createdAt ? new Date(user.createdAt as string).toLocaleDateString("id-ID") : "-"}`,
  ];

  if (registrations.length > 0) {
    lines.push("");
    lines.push(`📋 *PENDAFTARAN TURNAMEN (${registrations.length})*`);
    lines.push("─────────────────────");
    for (const reg of registrations) {
      const divLabel = (reg.division as string) === "female" ? "Female" : "Male";
      lines.push(`  📍 ${reg.tournamentName} (${divLabel})`);
      lines.push(`     Status: ${statusLabel(reg.status as string)}`);
      if (reg.tierAssigned) {
        lines.push(`     Tier: ${reg.tierAssigned}`);
      }
    }
  } else {
    lines.push("");
    lines.push(`⚠️ Anda belum terdaftar di turnamen manapun.`);
    lines.push(`💡 Gunakan !daftar <nama> [divisi] untuk mendaftar.`);
  }

  if (teams.length > 0) {
    lines.push("");
    lines.push(`👥 *TIM (${teams.length})*`);
    lines.push("─────────────────────");
    for (const team of teams) {
      const elim = (team.isEliminated as boolean)
        ? " [Keluar]"
        : "";
      lines.push(`  📌 ${team.teamName} — Seed #${team.seed}${elim}`);
      lines.push(`     Turnamen: ${team.tournamentName}`);
    }
  }

  lines.push("");
  lines.push("💡 Gunakan !profil untuk info detail, !statistik untuk statistik.");

  return { command: "!akun", reply: lines.join("\n") };
}

/**
 * !sawer <jumlah> [pesan] — Tip a player
 * Shows payment instructions with account details
 */
async function cmdSawer(args: string): Promise<CommandResult> {
  const tokens = parseArgs(args, 10);

  if (tokens.length < 1) {
    return {
      command: "!sawer",
      reply: [
        "💸 *SAWER PEMAIN*",
        "━━━━━━━━━━━━━━━━━━━━━",
        "",
        "Dukung pemain favorit Anda!",
        "Sawer akan menambah prize pool turnamen.",
        "",
        "❌ *Format salah!*",
        "",
        "Penggunaan: !sawer <jumlah> [pesan]",
        "",
        "Contoh: !sawer 10000",
        "Contoh: !sawer 10000 Semangat terus!",
        "",
        "💡 Jumlah minimal: 1 | Maksimal: 10,000,000",
      ].join("\n"),
    };
  }

  const amount = parseFloat(tokens[0]);

  if (isNaN(amount) || amount <= 0) {
    return {
      command: "!sawer",
      reply: "❌ Jumlah harus berupa angka positif.\n\n💡 Contoh: !sawer 10000",
    };
  }

  if (amount > 10000000) {
    return {
      command: "!sawer",
      reply: "❌ Jumlah terlalu besar. Maksimal 10,000,000.\n\n💡 Gunakan jumlah yang lebih kecil atau hubungi admin untuk jumlah besar.",
    };
  }

  const message = tokens.slice(1).join(" ") || null;

  console.log(
    `[WhatsApp Bot] !sawer → amount=${amount}, message="${message || "-"}"`
  );

  // Fetch payment settings
  const paymentSettings = await getPaymentSettings();

  // Call sawer API (senderName from args or default)
  const result = await postToMainApp("api/sawer", {
    senderName: "WhatsApp User",
    amount,
    message,
  });

  if (!result.ok) {
    const errData = result.data as { error?: string } | undefined;
    return {
      command: "!sawer",
      reply: `❌ Gagal mengirim sawer: ${errData?.error || "Kesalahan server"}\n\n💡 Silakan coba lagi atau hubungi admin.`,
    };
  }

  // Build premium response with payment instructions
  const lines: string[] = [
    "💸 *SAWER PEMAIN*",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `💰 Jumlah: *${formatMoney(amount)}*`,
  ];

  if (message) {
    lines.push(`💬 Pesan: _"${message}"_`);
  }

  lines.push(`📋 Status: ⏳ *Menunggu Pembayaran*`);
  lines.push("🎯 Sawer akan masuk ke *Prize Pool* turnamen!");
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("💳 *CARA PEMBAYARAN*");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  // Show payment methods based on settings
  if (paymentSettings) {
    const methods = paymentSettings.activeMethods || [];

    // Bank Transfer
    if (methods.includes('bank_transfer') && paymentSettings.bankNumber) {
      lines.push("🏦 *TRANSFER BANK*");
      lines.push(`   Bank: *${paymentSettings.bankName || 'Bank'}*`);
      lines.push(`   No. Rekening: *${paymentSettings.bankNumber}*`);
      lines.push(`   Atas Nama: *${paymentSettings.bankHolder || 'IDOL META'}*`);
      lines.push("");
    }

    // E-Wallets
    if (methods.includes('ewallet')) {
      if (paymentSettings.gopayNumber) {
        lines.push("💚 *GOPAY*");
        lines.push(`   No: *${paymentSettings.gopayNumber}*`);
        lines.push(`   Nama: *${paymentSettings.gopayHolder || 'IDOL META'}*`);
        lines.push("");
      }
      if (paymentSettings.ovoNumber) {
        lines.push("💜 *OVO*");
        lines.push(`   No: *${paymentSettings.ovoNumber}*`);
        lines.push(`   Nama: *${paymentSettings.ovoHolder || 'IDOL META'}*`);
        lines.push("");
      }
      if (paymentSettings.danaNumber) {
        lines.push("💙 *DANA*");
        lines.push(`   No: *${paymentSettings.danaNumber}*`);
        lines.push(`   Nama: *${paymentSettings.danaHolder || 'IDOL META'}*`);
        lines.push("");
      }
    }

    // QRIS
    if (methods.includes('qris') && paymentSettings.qrisLabel) {
      lines.push("📱 *QRIS*");
      lines.push(`   Merchant: *${paymentSettings.qrisLabel}*`);
      lines.push("   Scan QR code di website untuk bayar");
      lines.push("");
    }
  } else {
    // Fallback if settings not available
    lines.push("⚠️ _Info pembayaran belum tersedia_");
    lines.push("Hubungi admin untuk detail pembayaran");
    lines.push("");
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("📝 *KONFIRMASI PEMBAYARAN*");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("Setelah transfer, kirim bukti ke:");
  lines.push("▸ Admin grup atau");
  lines.push("▸ Chat pribadi admin");
  lines.push("");
  lines.push("✅ Sawer akan dikonfirmasi oleh admin");
  lines.push("   setelah bukti pembayaran diterima.");
  lines.push("");
  lines.push("🙏 Terima kasih atas dukungan Anda!");
  lines.push("💡 Ketik *!topsawer* untuk melihat kontributor teratas.");

  return { command: "!sawer", reply: lines.join("\n") };
}

/**
 * Get payment settings from main app API
 */
interface PaymentSettings {
  bankName: string;
  bankCode: string;
  bankNumber: string;
  bankHolder: string;
  gopayNumber: string;
  gopayHolder: string;
  ovoNumber: string;
  ovoHolder: string;
  danaNumber: string;
  danaHolder: string;
  qrisLabel: string;
  qrisImage: string;
  activeMethods: string[];
}

async function getPaymentSettings(): Promise<PaymentSettings | null> {
  try {
    const result = await getFromMainApp("api/payment-settings");
    if (result.ok && result.data) {
      const data = result.data as { settings?: PaymentSettings };
      return data.settings || null;
    }
    return null;
  } catch (err) {
    console.error("[WhatsApp Bot] Failed to fetch payment settings:", (err as Error).message);
    return null;
  }
}

/**
 * !donasi <jumlah> [pesan] — Donate to Season 2 fund
 * Shows payment instructions with account details
 */
async function cmdDonasi(args: string): Promise<CommandResult> {
  const tokens = parseArgs(args, 10);

  if (tokens.length < 1) {
    return {
      command: "!donasi",
      reply: [
        "💝 *DONASI SEASON 2*",
        "━━━━━━━━━━━━━━━━━━━━━",
        "",
        "Dukung penyelenggaraan liga!",
        "",
        "❌ *Format salah!*",
        "",
        "Penggunaan: !donasi <jumlah> [pesan]",
        "",
        "Contoh: !donasi 50000",
        "Contoh: !donasi 50000 Untuk Season 2",
        "",
        "💡 Jumlah minimal: 1 | Maksimal: 100,000,000",
      ].join("\n"),
    };
  }

  const amount = parseFloat(tokens[0]);

  if (isNaN(amount) || amount <= 0) {
    return {
      command: "!donasi",
      reply: "❌ Jumlah harus berupa angka positif.\n\n💡 Contoh: !donasi 50000",
    };
  }

  if (amount > 100000000) {
    return {
      command: "!donasi",
      reply: "❌ Jumlah terlalu besar. Maksimal 100,000,000.\n\n💡 Gunakan jumlah yang lebih kecil atau hubungi admin untuk jumlah besar.",
    };
  }

  const message = tokens.slice(1).join(" ") || "";

  console.log(
    `[WhatsApp Bot] !donasi → amount=${amount}, message="${message || "-"}"`
  );

  // Fetch payment settings
  const paymentSettings = await getPaymentSettings();

  // Call donations API (anonymous by default from WhatsApp)
  const result = await postToMainApp("api/donations", {
    amount,
    message,
    anonymous: true,
  });

  if (!result.ok) {
    const errData = result.data as { error?: string } | undefined;
    return {
      command: "!donasi",
      reply: `❌ Gagal mengirim donasi: ${errData?.error || "Kesalahan server"}\n\n💡 Silakan coba lagi atau hubungi admin.`,
    };
  }

  // Build premium response with payment instructions
  const lines: string[] = [
    "💝 *DONASI SEASON 2*",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `💰 Jumlah: *${formatMoney(amount)}*`,
  ];

  if (message) {
    lines.push(`💬 Pesan: _"${message}"_`);
  }

  lines.push(`📋 Status: ⏳ *Menunggu Pembayaran*`);
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("💳 *CARA PEMBAYARAN*");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  // Show payment methods based on settings
  if (paymentSettings) {
    const methods = paymentSettings.activeMethods || [];

    // Bank Transfer
    if (methods.includes('bank_transfer') && paymentSettings.bankNumber) {
      lines.push("🏦 *TRANSFER BANK*");
      lines.push(`   Bank: *${paymentSettings.bankName || 'Bank'}*`);
      lines.push(`   No. Rekening: *${paymentSettings.bankNumber}*`);
      lines.push(`   Atas Nama: *${paymentSettings.bankHolder || 'IDOL META'}*`);
      lines.push("");
    }

    // E-Wallets
    if (methods.includes('ewallet')) {
      if (paymentSettings.gopayNumber) {
        lines.push("💚 *GOPAY*");
        lines.push(`   No: *${paymentSettings.gopayNumber}*`);
        lines.push(`   Nama: *${paymentSettings.gopayHolder || 'IDOL META'}*`);
        lines.push("");
      }
      if (paymentSettings.ovoNumber) {
        lines.push("💜 *OVO*");
        lines.push(`   No: *${paymentSettings.ovoNumber}*`);
        lines.push(`   Nama: *${paymentSettings.ovoHolder || 'IDOL META'}*`);
        lines.push("");
      }
      if (paymentSettings.danaNumber) {
        lines.push("💙 *DANA*");
        lines.push(`   No: *${paymentSettings.danaNumber}*`);
        lines.push(`   Nama: *${paymentSettings.danaHolder || 'IDOL META'}*`);
        lines.push("");
      }
    }

    // QRIS
    if (methods.includes('qris') && paymentSettings.qrisLabel) {
      lines.push("📱 *QRIS*");
      lines.push(`   Merchant: *${paymentSettings.qrisLabel}*`);
      lines.push("   Scan QR code di website untuk bayar");
      lines.push("");
    }
  } else {
    // Fallback if settings not available
    lines.push("⚠️ _Info pembayaran belum tersedia_");
    lines.push("Hubungi admin untuk detail pembayaran");
    lines.push("");
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("📝 *KONFIRMASI PEMBAYARAN*");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("Setelah transfer, kirim bukti ke:");
  lines.push("▸ Admin grup atau");
  lines.push("▸ Chat pribadi admin");
  lines.push("");
  lines.push("✅ Donasi akan dikonfirmasi oleh admin");
  lines.push("   setelah bukti pembayaran diterima.");
  lines.push("");
  lines.push("🙏 Terima kasih atas dukungan Anda!");
  lines.push("💡 Ketik *!topdonasi* untuk melihat donatur teratas.");

  return { command: "!donasi", reply: lines.join("\n") };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLUB COMMAND HANDLER (Async — API calls)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * !club [nama] — View club leaderboard / details
 * !club       → Show all clubs with total points and member count
 * !club NEXUS → Show specific club details (members list)
 */
async function cmdClub(args: string): Promise<CommandResult> {
  const clubName = args.trim();

  if (clubName) {
    // Specific club details
    const slug = clubName.toLowerCase().replace(/\s+/g, "-");
    const result = await getFromMainApp("api/clubs", { slug, limit: "10" });

    if (!result.ok || !result.data) {
      const errData = result.data as { error?: string } | undefined;
      return {
        command: "!club",
        reply: [
          `❌ Club "${clubName}" tidak ditemukan.`,
          "",
          "💡 Pastikan nama club sudah benar (case-insensitive).",
          "💡 Gunakan !club tanpa argumen untuk melihat daftar semua club.",
        ].join("\n"),
      };
    }

    const data = result.data as {
      clubs?: Array<{
        id: string;
        name: string;
        slug: string;
        totalPoints: number;
        memberCount: number;
        members?: Array<{ name: string; tier: string; points: number }>;
        description?: string;
      }>;
    };

    const clubs = data.clubs || [];

    if (clubs.length === 0) {
      return {
        command: "!club",
        reply: [
          `❌ Club "${clubName}" tidak ditemukan.`,
          "",
          "💡 Gunakan !club tanpa argumen untuk melihat daftar semua club.",
        ].join("\n"),
      };
    }

    const club = clubs[0];
    const lines: string[] = [
      `🏟️ *CLUB: ${club.name.toUpperCase()}*`,
      "─────────────────────",
    ];

    if (club.description) {
      lines.push(`💬 ${club.description}`);
      lines.push("");
    }

    lines.push(`🏆 Total Poin: ${club.totalPoints}`);
    lines.push(`👥 Jumlah Anggota: ${club.memberCount}`);

    if (club.members && club.members.length > 0) {
      lines.push("");
      lines.push(`📋 *DAFTAR ANGGOTA (${club.members.length})*`);
      lines.push("─────────────────────");

      const medals = ["🥇", "🥈", "🥉"];
      for (let i = 0; i < club.members.length; i++) {
        const m = club.members[i];
        const rank = medals[i] || `${String(i + 1).padStart(2, " ")}.`;
        const tierIcon = getTierIcon(m.tier);
        lines.push(`  ${rank} ${tierIcon} *${m.name}* — Tier ${m.tier} | 🏆 ${m.points} pts`);
      }
    }

    lines.push("");
    lines.push("💡 Gunakan !club untuk melihat ranking semua club.");

    return { command: "!club", reply: lines.join("\n") };
  }

  // No args — show all clubs leaderboard
  const result = await getFromMainApp("api/clubs", { limit: "10" });

  if (!result.ok || !result.data) {
    return {
      command: "!club",
      reply: [
        "⚠️ Gagal mengambil data club.",
        "",
        "💡 Coba lagi nanti atau hubungi admin.",
      ].join("\n"),
    };
  }

  const data = result.data as {
    clubs?: Array<{
      id: string;
      name: string;
      slug: string;
      totalPoints: number;
      memberCount: number;
    }>;
  };

  const clubs = data.clubs || [];

  if (clubs.length === 0) {
    return {
      command: "!club",
      reply: [
        "📋 Belum ada club yang terdaftar.",
        "",
        "💡 Hubungi admin untuk membuat club baru.",
        "💡 Daftar dengan club: !daftar <nama> [divisi] <club>",
      ].join("\n"),
    };
  }

  const lines: string[] = [
    "🏟️ *RANKING CLUB*",
    `📊 ${clubs.length} club terdaftar`,
    "",
  ];

  const medals = ["🥇", "🥈", "🥉"];

  for (let i = 0; i < clubs.length; i++) {
    const c = clubs[i];
    const rank = medals[i] || `${String(i + 1).padStart(2, " ")}.`;
    lines.push(`${rank} *${c.name.toUpperCase()}*`);
    lines.push(`   🏆 ${c.totalPoints} pts | 👥 ${c.memberCount} anggota`);
    lines.push("");
  }

  lines.push("─────────────────────");
  lines.push("💡 Gunakan !club <nama> untuk detail anggota club.");
  lines.push("💡 Contoh: !club NEXUS");

  return { command: "!club", reply: lines.join("\n") };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND ROUTER
// ═══════════════════════════════════════════════════════════════════════════

/** All known command strings (for detection) */
const KNOWN_COMMANDS = new Set([
  "!bantuan",
  "!daftar",
  "!akun",
  "!status",
  "!pemain",
  "!tim",
  "!bracket",
  "!hasil",
  "!jadwal",
  "!peringkat",
  "!juara",
  "!hadiah",
  "!sawer",
  "!donasi",
  "!mvp",
  "!profil",
  "!statistik",
  "!grup",
  "!nextmatch",
  "!topdonasi",
  "!topsawer",
  "!club",
]);

/** Commands that should generate premium image templates */
const IMAGE_COMMANDS = new Set([
  "!pemain",
  "!peringkat",
  "!bracket",
  "!juara",
  "!club",
  "!status",
  "!jadwal",
  "!hasil",
]);

/** Check if a message starts with a command prefix (!) */
function isCommand(message: string): boolean {
  const { cmd } = parseCommand(message);
  // Accept any message starting with ! as a command attempt
  // This allows fuzzy suggestion to work for typos
  return cmd.startsWith(COMMAND_PREFIX);
}

/**
 * Process a command — returns sync result or a Promise for async commands.
 * The webhook handler uses this to determine if we need to await.
 * @param rawMessage - The raw message text
 * @param senderPhone - The sender's normalized phone number (digits only)
 * @param senderJid - The sender's full WhatsApp JID (e.g., 62812345678@s.whatsapp.net or 10814945763505@lid)
 */
function processCommand(
  rawMessage: string,
  senderPhone: string = "",
  senderJid: string = ""
): CommandResult | Promise<CommandResult> {
  const { cmd, args } = parseCommand(rawMessage);

  // Sync commands (DB reads only)
  switch (cmd) {
    case "!bantuan":
      return cmdBantuan();
    case "!status":
      return cmdStatus();
    case "!pemain":
      return cmdPemain(args);
    case "!tim":
      return cmdTim();
    case "!bracket":
      return cmdBracket(args);
    case "!hasil":
      return cmdHasil();
    case "!jadwal":
      return cmdJadwal();
    case "!peringkat":
      return cmdPeringkat(args);
    case "!juara":
      return cmdJuara(args);
    case "!hadiah":
      return cmdHadiah();
    case "!mvp":
      return cmdMvp();
    case "!profil":
      return cmdProfil(args);
    case "!statistik":
      return cmdStatistik(args);
    case "!grup":
      return cmdGrup();
    case "!nextmatch":
      return cmdNextmatch();
    case "!topdonasi":
      return cmdTopdonasi();
    case "!topsawer":
      return cmdTopsawer();

    // Async commands (API calls) — receive sender phone and JID for identity
    case "!club":
      return cmdClub(args);
    case "!daftar":
      return cmdDaftar(args, senderPhone, senderJid);
    case "!akun":
      return cmdAkun(senderPhone, senderJid);
    case "!sawer":
      return cmdSawer(args);
    case "!donasi":
      return cmdDonasi(args);
  }

  // Unknown command — suggest similar commands
  const similar = findSimilarCommand(cmd);
  const suggestion = similar
    ? `\n\n💡 Mungkin maksud Anda: ${similar}`
    : "";

  return {
    command: cmd,
    reply: `❓ Perintah tidak dikenali: ${cmd}${suggestion}\n\nKetik *!bantuan* untuk melihat daftar perintah yang tersedia.`,
  };
}

/** Find a similar command for typo correction */
function findSimilarCommand(input: string): string | null {
  if (!input.startsWith("!")) return null;
  const inputLower = input.toLowerCase();

  let bestMatch: string | null = null;
  let bestScore = 0;
  const threshold = input.length * 0.5; // at least 50% match

  for (const cmd of KNOWN_COMMANDS) {
    // Simple starts-with or includes check
    let score = 0;
    if (cmd.startsWith(inputLower)) {
      score = inputLower.length;
    } else if (inputLower.startsWith(cmd.substring(0, 4))) {
      score = Math.min(inputLower.length, cmd.length) * 0.8;
    }

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = cmd;
    }
  }

  return bestMatch;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE TEMPLATE DATA PREPARATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prepare data for the pemain (player list) image template.
 * Queries the same data as cmdPemain but formats for the image engine.
 * Supports division filtering: !pemain male, !pemain female, or !pemain (all divisions as array)
 * Returns an array when no division specified (one item per division with data).
 */
function preparePemainImage(args: string): any | null {
  if (!isDbAvailable()) return null;

  const divisionInput = args.toLowerCase().trim();

  // Validate division argument
  if (divisionInput && divisionInput !== "male" && divisionInput !== "female") {
    return null; // Invalid division — let text fallback handle it
  }

  // Specific division requested
  if (divisionInput === "male" || divisionInput === "female") {
    return preparePemainImageByDivision(divisionInput);
  }

  // No division specified - return array with both divisions
  const results: any[] = [];

  // Get male division data
  const maleData = preparePemainImageByDivision("male");
  if (maleData) results.push(maleData);

  // Get female division data
  const femaleData = preparePemainImageByDivision("female");
  if (femaleData) results.push(femaleData);

  if (results.length === 0) return null;

  // Return array with both divisions (message handler will send multiple images)
  return results;
}

/** Helper: Get pemain image data for a specific division */
function preparePemainImageByDivision(division: 'male' | 'female'): any | null {
  const tournament = safeGet(
    `SELECT id, name FROM Tournament WHERE division = ? ORDER BY createdAt DESC LIMIT 1`,
    [division]
  );

  if (!tournament) return null;

  const tournamentId = tournament.id as string;
  const tournamentName = tournament.name as string;

  const registrations = safeQuery(
    `SELECT r.status as regStatus, r.tierAssigned,
            u.name, u.tier, u.gender, u.points
     FROM Registration r
     JOIN User u ON r.userId = u.id
     WHERE r.tournamentId = ?
     ORDER BY
       CASE r.status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
       u.name ASC`,
    [tournamentId]
  );

  if (registrations.length === 0) return null;

  return {
    tournament: tournamentName,
    division: division,
    approved: registrations
      .filter((r) => r.regStatus === "approved")
      .map((r) => ({
        name: r.name as string,
        tier: (r.tierAssigned as string) || (r.tier as string),
        gender: r.gender as string,
      })),
    pending: registrations
      .filter((r) => r.regStatus === "pending")
      .map((r) => ({ name: r.name as string })),
    total: registrations.length,
  };
}

/**
 * Prepare data for the peringkat (leaderboard) image template.
 * Queries the same data as cmdPeringkat but with division filtering.
 * Supports division filtering: !peringkat male, !peringkat female, or !peringkat (all divisions as array)
 * Returns an array when no division specified (one item per division with data).
 */
function preparePeringkatImage(args: string): any | null {
  if (!isDbAvailable()) return null;

  const divisionInput = args.toLowerCase().trim();

  // Validate division argument
  if (divisionInput && divisionInput !== "male" && divisionInput !== "female") {
    return null; // Invalid division — let text fallback handle it
  }

  // Specific division requested
  if (divisionInput === "male" || divisionInput === "female") {
    return preparePeringkatImageByDivision(divisionInput);
  }

  // No division specified - return array with both divisions
  const results: any[] = [];

  // Get male division data
  const maleData = preparePeringkatImageByDivision("male");
  if (maleData) results.push(maleData);

  // Get female division data
  const femaleData = preparePeringkatImageByDivision("female");
  if (femaleData) results.push(femaleData);

  if (results.length === 0) return null;

  // Return array with both divisions (message handler will send multiple images)
  return results;
}

/** Helper: Get peringkat image data for a specific division */
function preparePeringkatImageByDivision(division: 'male' | 'female'): any | null {
  // Filter by gender matching the division
  const genderFilter = division === 'female' ? "WHERE u.gender = 'female'" : "WHERE u.gender = 'male'";

  const rankings = safeQuery(
    `SELECT u.name, u.gender, u.tier, u.points,
            COALESCE(r.wins, 0) as wins,
            COALESCE(r.losses, 0) as losses
     FROM User u
     LEFT JOIN Ranking r ON u.id = r.userId
     ${genderFilter}
     ORDER BY u.points DESC, u.name ASC
     LIMIT 10`
  );

  if (rankings.length === 0) return null;

  return {
    players: rankings.map((u, i) => {
      const wins = u.wins as number;
      const losses = u.losses as number;
      const total = wins + losses;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      return {
        rank: i + 1,
        name: u.name as string,
        gender: u.gender as string,
        tier: u.tier as string,
        points: u.points as number,
        wins,
        losses,
        winRate,
      };
    }),
    division: division,
  };
}

/**
 * Prepare data for the bracket image template.
 * Queries the same data as cmdBracket, groups matches by rounds.
 * Supports division filtering: !bracket male, !bracket female, or !bracket (latest)
 */
function prepareBracketImage(args: string): any | null {
  if (!isDbAvailable()) return null;

  const divisionInput = args.toLowerCase().trim();

  // Validate division argument
  if (divisionInput && divisionInput !== "male" && divisionInput !== "female") {
    return null; // Invalid division — let text fallback handle it
  }

  // If specific division requested
  if (divisionInput === "male" || divisionInput === "female") {
    return prepareBracketImageByDivision(divisionInput);
  }

  // No division specified - get the latest tournament with matches
  const tournament = safeGet(
    `SELECT t.id, t.name, t.division, t.bracketType
     FROM Tournament t
     WHERE t.id IN (SELECT DISTINCT tournamentId FROM Match)
     ORDER BY t.createdAt DESC LIMIT 1`
  );

  if (!tournament) return null;

  return prepareBracketData(tournament);
}

/** Helper: Get bracket image data for a specific division */
function prepareBracketImageByDivision(division: 'male' | 'female'): any | null {
  const tournament = safeGet(
    `SELECT t.id, t.name, t.division, t.bracketType
     FROM Tournament t
     WHERE t.division = ? AND t.id IN (SELECT DISTINCT tournamentId FROM Match)
     ORDER BY t.createdAt DESC LIMIT 1`,
    [division]
  );

  if (!tournament) return null;

  return prepareBracketData(tournament);
}

/** Helper: Prepare bracket data from tournament row */
function prepareBracketData(tournament: DbRow): any | null {
  const matches = safeQuery(
    `SELECT m.round, m.matchNumber, m.scoreA, m.scoreB, m.status, m.bracket,
            tA.name as teamAName, tB.name as teamBName,
            w.name as winnerName
     FROM Match m
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     LEFT JOIN Team w ON m.winnerId = w.id
     WHERE m.tournamentId = ?
     ORDER BY m.bracket ASC, m.round ASC, m.matchNumber ASC`,
    [tournament.id]
  );

  if (matches.length === 0) return null;

  const isDoubleElim = tournament.bracketType === "double";
  const maxRound = Math.max(...matches.map((m) => m.round as number));
  const rounds: Array<{ label: string; matches: any[] }> = [];

  if (isDoubleElim) {
    // Group by bracket type first
    const bracketGroups = new Map<string, DbRow[]>();
    for (const match of matches) {
      const bracket = (match.bracket as string) || "winners";
      if (!bracketGroups.has(bracket)) bracketGroups.set(bracket, []);
      bracketGroups.get(bracket)!.push(match);
    }

    const bracketLabels: Record<string, string> = {
      winners: "Winners Bracket",
      losers: "Losers Bracket",
      grand_final: "Grand Final",
    };

    for (const [bracket, bracketMatches] of bracketGroups) {
      const bracketRoundMax = Math.max(...bracketMatches.map((m) => m.round as number));
      for (const match of bracketMatches) {
        const roundLabel = getRoundLabel(match.round as number, bracketRoundMax);
        rounds.push({
          label: `${bracketLabels[bracket] || bracket} — ${roundLabel}`,
          matches: [
            {
              matchNumber: match.matchNumber as number,
              teamA: (match.teamAName as string) || "TBD",
              scoreA: match.scoreA as number | null,
              teamB: (match.teamBName as string) || "TBD",
              scoreB: match.scoreB as number | null,
              status: match.status as string,
              winner: match.winnerName as string | null,
            },
          ],
        });
      }
    }
  } else {
    // Group by round
    const roundMap = new Map<number, DbRow[]>();
    for (const match of matches) {
      const round = match.round as number;
      if (!roundMap.has(round)) roundMap.set(round, []);
      roundMap.get(round)!.push(match);
    }

    for (const [round, roundMatches] of roundMap) {
      rounds.push({
        label: getRoundLabel(round, maxRound),
        matches: roundMatches.map((match) => ({
          matchNumber: match.matchNumber as number,
          teamA: (match.teamAName as string) || "TBD",
          scoreA: match.scoreA as number | null,
          teamB: (match.teamBName as string) || "TBD",
          scoreB: match.scoreB as number | null,
          status: match.status as string,
          winner: match.winnerName as string | null,
        })),
      });
    }
  }

  return {
    tournament: tournament.name as string,
    division: tournament.division as string,
    bracketType: tournament.bracketType as string || "single",
    rounds,
  };
}

/**
 * Prepare data for the juara (champions) image template.
 * Supports division filtering: !juara male, !juara female, or !juara (all)
 */
function prepareJuaraImage(args: string): any | null {
  if (!isDbAvailable()) return null;

  const divisionInput = args.toLowerCase().trim();

  // Validate division argument
  if (divisionInput && divisionInput !== "male" && divisionInput !== "female") {
    return null; // Invalid division — let text fallback handle it
  }

  // If specific division requested
  if (divisionInput === "male" || divisionInput === "female") {
    return prepareJuaraImageByDivision(divisionInput);
  }

  // No division specified - return array with both divisions
  const results: any[] = [];

  // Get male division champions
  const maleData = prepareJuaraImageByDivision("male");
  if (maleData) results.push(maleData);

  // Get female division champions
  const femaleData = prepareJuaraImageByDivision("female");
  if (femaleData) results.push(femaleData);

  if (results.length === 0) return null;

  // Return array with both divisions
  return results;
}

/** Helper: Get juara image data for a specific division */
function prepareJuaraImageByDivision(division: 'male' | 'female'): any | null {
  const champions = getChampionsByDivision(division);

  if (champions.length === 0) return null;

  return {
    division: division,
    champions: champions.map((c, i) => ({
      rank: i + 1,
      tournamentName: c.tournamentName,
      winner: c.winnerName,
      runnerUp: c.runnerUp,
      mvp: c.mvpName,
      status: c.status,
    })),
  };
}

/**
 * Prepare data for the club image template.
 * Fetches club data via the main app API (same as cmdClub).
 */
async function prepareClubImage(args: string): Promise<any | null> {
  try {
    const clubName = args.trim();
    const queryParams: Record<string, string> = { limit: "10" };

    if (clubName) {
      queryParams.slug = clubName.toLowerCase().replace(/\s+/g, "-");
    }

    const result = await getFromMainApp("api/clubs", queryParams);

    if (!result.ok || !result.data) return null;

    const data = result.data as {
      clubs?: Array<{
        id: string;
        name: string;
        slug: string;
        totalPoints: number;
        memberCount: number;
      }>;
    };

    const clubs = data.clubs || [];
    if (clubs.length === 0) return null;

    return {
      clubs: clubs.map((c, i) => ({
        rank: i + 1,
        name: c.name,
        totalPoints: c.totalPoints,
        memberCount: c.memberCount,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Prepare data for the status (tournament status) image template.
 * Queries the same data as cmdStatus.
 */
function prepareStatusImage(): any | null {
  if (!isDbAvailable()) return null;

  const tournaments = safeQuery(
    `SELECT t.id, t.name, t.division, t.type, t.status, t.week, t.bracketType, t.prizePool,
            (SELECT COUNT(*) FROM Registration r WHERE r.tournamentId = t.id) as playerCount,
            (SELECT COUNT(*) FROM Match m WHERE m.tournamentId = t.id) as matchCount
     FROM Tournament t
     ORDER BY t.createdAt DESC
     LIMIT 6`
  );

  if (tournaments.length === 0) return null;

  return {
    tournaments: tournaments.map((t) => ({
      name: t.name as string,
      division: (t.division as string) || "male",
      status: t.status as string,
      week: t.week as number | null,
      bracketType: t.bracketType as string || "",
      prizePool: t.prizePool as number,
      playerCount: t.playerCount as number,
      matchCount: t.matchCount as number,
    })),
  };
}

/**
 * Prepare data for the jadwal (schedule) image template.
 * Queries the same data as cmdJadwal.
 */
function prepareJadwalImage(): any | null {
  if (!isDbAvailable()) return null;

  const live = safeQuery(
    `SELECT m.round, m.matchNumber, m.scoreA, m.scoreB,
            t.name as tournamentName,
            tA.name as teamAName, tB.name as teamBName
     FROM Match m
     JOIN Tournament t ON m.tournamentId = t.id
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     WHERE m.status = 'ongoing'
     ORDER BY m.scheduledAt ASC`
  );

  const pending = safeQuery(
    `SELECT m.round, m.matchNumber,
            t.name as tournamentName,
            tA.name as teamAName, tB.name as teamBName,
            m.scheduledAt
     FROM Match m
     JOIN Tournament t ON m.tournamentId = t.id
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     WHERE m.status = 'pending'
     ORDER BY
       CASE WHEN m.scheduledAt IS NOT NULL THEN 0 ELSE 1 END,
       m.scheduledAt ASC,
       m.round ASC,
       m.matchNumber ASC
     LIMIT 10`
  );

  if (live.length === 0 && pending.length === 0) return null;

  return {
    live: live.map((m) => ({
      teamA: (m.teamAName as string) || "TBD",
      scoreA: (m.scoreA as number) || 0,
      teamB: (m.teamBName as string) || "TBD",
      scoreB: (m.scoreB as number) || 0,
      tournament: m.tournamentName as string,
      round: m.round as number,
    })),
    pending: pending.map((m) => ({
      teamA: (m.teamAName as string) || "TBD",
      teamB: (m.teamBName as string) || "TBD",
      tournament: m.tournamentName as string,
      round: m.round as number,
      matchNumber: m.matchNumber as number,
      scheduledAt: m.scheduledAt as string | null,
    })),
  };
}

/**
 * Prepare data for the hasil (match results) image template.
 * Queries the same data as cmdHasil.
 */
function prepareHasilImage(): any | null {
  if (!isDbAvailable()) return null;

  const results = safeQuery(
    `SELECT m.round, m.matchNumber, m.scoreA, m.scoreB,
            t.name as tournamentName,
            tA.name as teamAName, tB.name as teamBName,
            w.name as winnerName, mvp.name as mvpName, m.completedAt
     FROM Match m
     JOIN Tournament t ON m.tournamentId = t.id
     LEFT JOIN Team tA ON m.teamAId = tA.id
     LEFT JOIN Team tB ON m.teamBId = tB.id
     LEFT JOIN Team w ON m.winnerId = w.id
     LEFT JOIN User mvp ON m.mvpId = mvp.id
     WHERE m.status = 'completed'
     ORDER BY m.completedAt DESC
     LIMIT 15`
  );

  if (results.length === 0) return null;

  return {
    results: results.map((r) => ({
      teamA: (r.teamAName as string) || "TBD",
      scoreA: r.scoreA as number,
      teamB: (r.teamBName as string) || "TBD",
      scoreB: r.scoreB as number,
      winner: r.winnerName as string | null,
      mvp: r.mvpName as string | null,
      completedAt: r.completedAt as string | null,
      tournament: r.tournamentName as string,
    })),
  };
}

/**
 * Dispatcher: prepare image data for the given command.
 * Returns null if data is not available or not an image command.
 * Note: prepareClubImage is async (API call), others are sync (DB).
 */
async function prepareImageData(command: string, args: string): Promise<any | null> {
  switch (command) {
    case "!pemain": return preparePemainImage(args);
    case "!peringkat": return preparePeringkatImage(args);
    case "!bracket": return prepareBracketImage(args);
    case "!juara": return prepareJuaraImage(args);
    case "!club": return await prepareClubImage(args);
    case "!status": return prepareStatusImage();
    case "!jadwal": return prepareJadwalImage();
    case "!hasil": return prepareHasilImage();
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BAILEYS CONNECTION STATE
// ═══════════════════════════════════════════════════════════════════════════

let connectionState: 'connecting' | 'qr' | 'connected' | 'disconnected' = 'disconnected';
let lastQrCode: string | null = null;
let sock: ReturnType<typeof makeWASocket> | null = null;
const AUTH_DIR = path.resolve(import.meta.dir, "auth");

// Group participant sessions cache
const groupParticipantsCache = new Map<string, Set<string>>();
const participantSessions = new Map<string, number>(); // Track last session attempt
const participantSessionPromises = new Map<string, Promise<void>>(); // Track in-progress session establishment

/**
 * Ensure we have Signal sessions with group participants
 * This is crucial for group messaging to work
 */
async function ensureGroupSessions(jid: string): Promise<boolean> {
  if (!sock) return false;

  try {
    // Get group metadata - always fetch fresh
    console.log(`[WhatsApp Bot] 🔄 Fetching fresh group metadata for ${jid}...`);
    const metadata = await sock.groupMetadata(jid);
    if (!metadata) {
      console.log(`[WhatsApp Bot] ⚠️ No metadata for group ${jid}`);
      return false;
    }

    const participants = metadata.participants || [];
    const subject = metadata.subject || 'Unknown';
    console.log(`[WhatsApp Bot] 📁 Group: ${subject} (${participants.length} participants)`);

    // Cache participants
    const participantJids = new Set(participants.map((p: any) => p.id));
    groupParticipantsCache.set(jid, participantJids);

    // Check if we need to force session creation
    const botId = sock.user?.id?.split(':')[0] || '';
    const botFullId = sock.user?.id || '';
    const botLid = botFullId.split(':')[0];

    // Filter out the bot itself - support both @s.whatsapp.net and @lid formats
    const otherParticipants = participants.filter((p: any) => {
      const pid = p.id || '';
      // Exclude bot's own ID (both formats)
      if (pid.includes(botId) || pid === botLid + '@lid') return false;
      // Include both @s.whatsapp.net and @lid participants
      return pid.includes('@s.whatsapp.net') || pid.includes('@lid');
    });

    console.log(`[WhatsApp Bot] 🔑 Checking sessions for ${otherParticipants.length} other participants...`);

    // If no participants found, the bot might still be able to send using sender-key
    if (otherParticipants.length === 0) {
      console.log(`[WhatsApp Bot] ⚠️ No other participants found - will try sender-key mode`);
      return true; // Allow sending anyway
    }

    // Try to create sessions with participants by sending a "pre-key" message
    // This forces Baileys to establish Signal sessions
    // NOTE: For @lid addresses, presenceSubscribe might not work the same way
    let sessionsCreated = 0;
    for (const p of otherParticipants) {
      const pJid = p.id as string;
      const lastAttempt = participantSessions.get(pJid) || 0;
      const now = Date.now();

      // Only attempt once per minute per participant
      if (now - lastAttempt < 60000) {
        continue;
      }

      // Skip @lid addresses for now - they use different session mechanism
      // Focus on @s.whatsapp.net addresses
      if (pJid.includes('@lid')) {
        console.log(`[WhatsApp Bot]   ⏭️ Skipping @lid address: ${pJid.split('@')[0]} (uses different session)`);
        continue;
      }

      try {
        // Sending any message type will trigger session creation
        // We use a "reaction" or read receipt as it's less intrusive
        // But in Baileys, just fetching presence can trigger session
        const presence = await sock.presenceSubscribe(pJid);
        participantSessions.set(pJid, now);
        sessionsCreated++;
        console.log(`[WhatsApp Bot]   ✅ Session established with: ${pJid.split('@')[0]}`);
      } catch (e) {
        // Session might already exist or participant is offline
        console.log(`[WhatsApp Bot]   ⚠️ Could not establish session with ${pJid.split('@')[0]}: ${(e as Error).message}`);
      }

      // Small delay between session attempts
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`[WhatsApp Bot] 🔑 Sessions processed: ${sessionsCreated}/${otherParticipants.length}`);
    return true;
  } catch (err) {
    console.error(`[WhatsApp Bot] ❌ Failed to ensure group sessions: ${(err as Error).message}`);
    return false;
  }
}

// Helper: Send message with timeout to prevent hanging on group messages
async function sendMessageSafe(
  jid: string,
  content: any,
  timeoutMs: number = 15000
): Promise<{ success: boolean; error?: string }> {
  if (!sock) {
    return { success: false, error: 'Socket not available' };
  }

  const isGroup = jid.endsWith('@g.us');

  try {
    console.log(`[WhatsApp Bot] 📤 Sending to ${jid} (${isGroup ? 'GROUP' : 'PRIVATE'})...`);

    // For groups, skip session establishment entirely and try direct send
    // The sender-key mechanism should handle encryption automatically
    if (isGroup) {
      console.log(`[WhatsApp Bot] 📤 Group send - using direct sender-key mode`);
    }

    // Set up timeout - longer for groups to allow sender-key creation
    const actualTimeout = isGroup ? 30000 : timeoutMs;

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Send timeout after ' + actualTimeout + 'ms'));
      }, actualTimeout);
      // Return cleanup function
      return () => clearTimeout(timer);
    });

    // Send the message
    const sendPromise = sock.sendMessage(jid, content, {});

    // Race between send and timeout
    const result = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`[WhatsApp Bot] ✅ Send completed:`, result ? 'got response' : 'no response');
    return { success: true };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error(`[WhatsApp Bot] ⏱️ Send to ${jid} failed:`, errorMsg);

    // Don't retry for groups - just return the error
    return { success: false, error: errorMsg };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BAILEYS CONNECTION
// ═══════════════════════════════════════════════════════════════════════════

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

async function startBaileysConnection(): Promise<void> {
  try {
    console.log("[WhatsApp Bot] 📱 Initializing Baileys connection...");
    connectionState = 'connecting';

    const { state, saveCreds } = await initAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      printQRToTerminal: false,
      logger: {
        level: 'silent',
        child: function(..._args: any[]) {
          // Return a properly structured child logger
          return {
            level: 'silent',
            child: function(..._args: any[]) {
              return {
                level: 'silent',
                child: function() { return this; },
                trace: (..._args: any[]) => {},
                debug: (..._args: any[]) => {},
                info: (..._args: any[]) => {},
                warn: (..._args: any[]) => {},
                error: (..._args: any[]) => {},
                fatal: (..._args: any[]) => {},
              } as any;
            },
            trace: (..._args: any[]) => {},
            debug: (..._args: any[]) => {},
            info: (..._args: any[]) => {},
            warn: (..._args: any[]) => {},
            error: (..._args: any[]) => {},
            fatal: (..._args: any[]) => {},
          } as any;
        },
        trace: (..._args: any[]) => {},
        debug: (..._args: any[]) => {},
        info: (..._args: any[]) => {},
        warn: (..._args: any[]) => {},
        error: (..._args: any[]) => {},
        fatal: (..._args: any[]) => {},
      },
      shouldIgnoreJid: (jid: string) => {
        // Ignore status broadcasts and newsletter/journal jids
        return jid?.endsWith('@newsletter') || jid?.endsWith('@broadcast');
      },
      generateHighQualityLinkPreview: true,
      // Important: These settings help with group messaging
      retryRequestDelayMs: 1000,
      maxMsgRetryCount: 3,
      // Better message handling for retries
      getMessage: async (key: any) => {
        // Return a placeholder message for retry requests
        // This helps Baileys handle message retries properly
        if (key?.remoteJid?.endsWith('@g.us')) {
          console.log(`[WhatsApp Bot] 📝 getMessage called for group: ${key.remoteJid}`);
        }
        return { conversation: '' };
      },
    });

    // Save credentials on update
    sock?.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock?.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionState = 'qr';
        lastQrCode = qr;
        console.log('[WhatsApp Bot] 📋 QR Code received — scan to connect');
        console.log('[WhatsApp Bot]   GET /qr?format=png  → QR as PNG image');
        console.log('[WhatsApp Bot]   GET /qr?format=json → QR string for terminal');
      }

      if (connection === 'connecting') {
        connectionState = 'connecting';
        console.log('[WhatsApp Bot] 🔌 Connecting to WhatsApp...');
      }

      if (connection === 'open') {
        connectionState = 'connected';
        lastQrCode = null; // Clear QR after successful connection
        console.log('[WhatsApp Bot] ✅ Connected to WhatsApp Web!');
        console.log('[WhatsApp Bot] 🤖 Bot is now online and receiving messages.');

        // Initialize signal session by sending a message to self
        // This helps establish encryption keys for messaging
        try {
          const botJid = sock?.user?.id;
          if (botJid) {
            console.log(`[WhatsApp Bot] 🔐 Initializing signal session for ${botJid}...`);
            // Send a message to self to establish session
            await sock?.sendMessage(botJid, { text: '🔐 Session initialized' });
            console.log('[WhatsApp Bot] ✅ Signal session initialized');
          }
        } catch (initErr) {
          console.log('[WhatsApp Bot] ⚠️ Could not initialize session:', (initErr as Error).message);
        }

        // Fetch all groups and establish sessions with participants
        // This is CRUCIAL for group messaging to work
        try {
          console.log('[WhatsApp Bot] 📋 Fetching groups and establishing participant sessions...');
          const groups = await sock?.groupFetchAllParticipating();

          if (groups) {
            const groupList = Object.entries(groups);
            console.log(`[WhatsApp Bot] ✅ Found ${groupList.length} groups`);

            for (const [jid, metadata] of groupList) {
              const groupMeta = metadata as any;
              console.log(`[WhatsApp Bot]   📁 ${groupMeta.subject || 'Unknown'} (${jid})`);

              // Try to get fresh metadata from server
              let participants = groupMeta.participants || [];
              console.log(`[WhatsApp Bot]      Raw participants count: ${participants.length}`);

              // If participants is empty, try fetching fresh metadata
              if (participants.length === 0) {
                try {
                  console.log(`[WhatsApp Bot]      🔄 Fetching fresh metadata for ${jid}...`);
                  const freshMeta = await sock?.groupMetadata(jid);
                  if (freshMeta?.participants) {
                    participants = freshMeta.participants;
                    console.log(`[WhatsApp Bot]      ✅ Fresh metadata: ${participants.length} participants`);
                  }
                } catch (metaErr) {
                  console.log(`[WhatsApp Bot]      ⚠️ Could not fetch fresh metadata: ${(metaErr as Error).message}`);
                }
              }

              // Cache participants
              const participantJids = new Set(participants.map((p: any) => p.id));
              groupParticipantsCache.set(jid, participantJids);

              // Establish sessions with non-bot participants
              const botId = sock?.user?.id?.split(':')[0] || '';
              const botFullId = sock?.user?.id || '';
              const botLid = botFullId.split(':')[0]; // Bot's base ID without device
              console.log(`[WhatsApp Bot]      Bot ID: ${botId}, Full ID: ${botFullId}, Bot LID base: ${botLid}`);

              // Debug: Log all participant IDs
              console.log(`[WhatsApp Bot]      All participants: ${participants.map((p: any) => p.id).join(', ')}`);

              // Filter out the bot itself - support both @s.whatsapp.net and @lid formats
              // WhatsApp now uses @lid for privacy in groups
              const otherParticipants = participants.filter((p: any) => {
                const pid = p.id || '';
                // Exclude bot's own ID (both formats)
                if (pid.includes(botId) || pid === botLid + '@lid') return false;
                // Include both @s.whatsapp.net and @lid participants
                return pid.includes('@s.whatsapp.net') || pid.includes('@lid');
              });

              console.log(`[WhatsApp Bot]      👥 ${otherParticipants.length} participants to establish session with`);

              // Log participant IDs for debugging
              if (otherParticipants.length > 0) {
                console.log(`[WhatsApp Bot]      Participant IDs: ${otherParticipants.slice(0, 3).map((p: any) => p.id?.split('@')[0]).join(', ')}${otherParticipants.length > 3 ? '...' : ''}`);
              }

              // Subscribe to presence for each participant (triggers session)
              let sessionsInitiated = 0;
              for (const p of otherParticipants) {
                try {
                  await sock?.presenceSubscribe(p.id);
                  participantSessions.set(p.id, Date.now());
                  sessionsInitiated++;
                } catch (sessErr) {
                  // Log but don't fail
                  console.log(`[WhatsApp Bot]      ⚠️ Session error for ${p.id?.split('@')[0]}: ${(sessErr as Error).message}`);
                }
                // Small delay to not overwhelm
                await new Promise(r => setTimeout(r, 50));
              }

              console.log(`[WhatsApp Bot]      ✅ Sessions initiated for ${sessionsInitiated}/${otherParticipants.length} participants`);
            }
          }
        } catch (groupErr) {
          console.log('[WhatsApp Bot] ⚠️ Could not fetch group metadata:', (groupErr as Error).message);
        }
      }

      if (connection === 'close') {
        lastQrCode = null;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut &&
          statusCode !== DisconnectReason.forbidden;

        if (shouldReconnect) {
          connectionState = 'disconnected';
          console.log(`[WhatsApp Bot] ⚠️ Connection lost (code: ${statusCode}), reconnecting in 5s...`);
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => { reconnectTimer = null; startBaileysConnection(); }, 5000);
        } else {
          connectionState = 'disconnected';
          console.log(`[WhatsApp Bot] 🚫 Logged out (code: ${statusCode}). Delete auth/ folder and scan QR again.`);
        }
      }
    });

    // Handle incoming messages
    sock?.ev.on('messages.upsert', async (m: any) => {
      // Only process 'notify' type messages (new incoming messages)
      // 'append' and 'replace' are for message updates/history sync
      if (m.type !== 'notify') {
        return;
      }

      const msg = m.messages?.[0];
      if (!msg) return;

      // Ignore status broadcasts, own messages, and non-user messages
      const jid = msg.key?.remoteJid;
      if (!jid) return;
      if (jid?.endsWith('@newsletter') || jid?.endsWith('@broadcast')) return;
      if (msg.key?.fromMe) return;
      if (msg.message?.protocolMessage) return; // Ignore protocol messages

      // Debug: Log message structure for groups
      const isGroup = jid?.endsWith('@g.us');
      if (isGroup) {
        console.log(`[WhatsApp Bot] 📢 GROUP MESSAGE DEBUG: jid=${jid}, participant=${msg.key?.participant}, hasMessage=${!!msg.message}`);
      }

      // Extract text from various message types (including ephemeral/disappearing messages in groups)
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.ephemeralMessage?.message?.conversation ||
        msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
        msg.message?.documentWithCaptionMessage?.message?.caption ||
        '';

      if (!text || !text.trim()) {
        if (isGroup) {
          console.log(`[WhatsApp Bot] 📢 GROUP MESSAGE: No text content found, message types:`, Object.keys(msg.message || {}));
        }
        return;
      }

      // Extract sender phone number
      // For groups: participant contains the actual sender's JID
      // For private: remoteJid is the sender
      const senderJid = msg.key?.participant || msg.key?.remoteJid;
      // Keep original JID for display formatting (to detect @lid format)
      const senderJidOriginal = senderJid || '';
      // Normalize phone number - handles @s.whatsapp.net, @lid, @g.us formats
      const senderPhone = normalizePhoneNumber(senderJidOriginal);
      // IMPORTANT: Store the full JID for reliable user identification
      // This is the PRIMARY identifier for WhatsApp users (handles @lid vs @s.whatsapp.net)
      const senderFullJid = senderJidOriginal;

      // IMPORTANT: For groups, establish session with the sender
      // This ensures we can reply to them and the group
      if (isGroup && senderJid && senderJid.includes('@s.whatsapp.net')) {
        try {
          // Subscribe to presence to establish Signal session
          await sock?.presenceSubscribe(senderJid);
          participantSessions.set(senderJid, Date.now());
          console.log(`[WhatsApp Bot] 🔑 Session established with sender: ${senderJid.split('@')[0]}`);
        } catch {
          // Ignore errors
        }
      }

      // Only process commands starting with !
      if (!text.startsWith(COMMAND_PREFIX)) {
        if (isGroup) {
          console.log(`[WhatsApp Bot] 📢 GROUP MESSAGE: Not a command (doesn't start with !): "${text.substring(0, 50)}..."`);
        }
        return;
      }

      console.log(
        `[WhatsApp Bot] 📩 MESSAGE ${isGroup ? '(GROUP)' : ''} ← from=${senderPhone} | msg="${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`
      );

      const { cmd, args } = parseCommand(text);

      // Rate limiting
      if (isRateLimited(senderPhone)) {
        console.log(`[WhatsApp Bot] ⚠️ RATE LIMITED → from=${senderPhone} | cmd=${cmd}`);

        addMessage({
          direction: 'inbound',
          from: senderPhone,
          to: 'bot',
          message: text,
          command: cmd,
          commandResponse: '⚠️ Rate limit tercapai. Maksimal 5 perintah per 30 detik.',
          phone: senderPhone,
        });

        totalCommandsProcessed++;
        addActivityLog({
          command: cmd,
          sender: senderPhone,
          replyPreview: 'RATE_LIMITED',
          success: false,
        });

        // Send rate limit warning
        try {
          await sock?.sendMessage(jid, {
            text: '⚠️ *Rate Limit Tercapai!*\n\nMaksimal 5 perintah per 30 detik.\nSilakan tunggu sebentar lalu coba lagi.',
          });
        } catch (err) {
          console.error('[WhatsApp Bot] Failed to send rate limit warning:', (err as Error).message);
        }
        return;
      }

      // Process command
      console.log(`[WhatsApp Bot] 🤖 Processing command: ${cmd}`);

      try {
        const result = await Promise.resolve(processCommand(text, senderPhone, senderFullJid));
        totalCommandsProcessed++;

        addMessage({
          direction: 'inbound',
          from: senderPhone,
          to: 'bot',
          message: text,
          command: result.command,
          commandResponse: result.reply,
          phone: senderPhone,
        });

        addActivityLog({
          command: result.command,
          sender: senderPhone,
          replyPreview: result.reply.substring(0, 100),
          success: true,
        });

        console.log(
          `[WhatsApp Bot] 🤖 COMMAND "${result.command}" → reply: ${result.reply.length} chars`
        );

        // Send reply via Baileys
        try {
          // Log the target JID for debugging
          console.log(`[WhatsApp Bot] 📤 Sending reply to: ${jid} ${isGroup ? '(GROUP)' : '(PRIVATE)'}`);

          if (IMAGE_COMMANDS.has(result.command)) {
            // Premium image template command — try to send image first
            // Skip image for !club with args (specific club query has detailed text with members)
            const isClubDetail = result.command === "!club" && args.trim().length > 0;

            if (isClubDetail) {
              // Specific club query — send detailed text (has member list, not in image)
              console.log(`[WhatsApp Bot] 📤 Sending club detail text to ${jid}`);
              const res = await sendMessageSafe(jid, { text: result.reply });
              console.log(`[WhatsApp Bot] ${res.success ? '✅' : '❌'} Club detail text ${res.success ? 'sent' : 'failed'} to ${jid}`);
            } else {
              const templateType = result.command.replace("!", "");
              const imageData = await prepareImageData(result.command, args);

              if (imageData) {
                // Check if imageData is an array (multiple divisions)
                if (Array.isArray(imageData)) {
                  // Send multiple images for different divisions
                  console.log(`[WhatsApp Bot] 📸 Sending ${imageData.length} images for ${result.command} to ${jid}`);

                  for (let i = 0; i < imageData.length; i++) {
                    const singleData = imageData[i];
                    const divisionLabel = singleData.division === 'female' ? 'FEMALE' : 'MALE';
                    const imageBuffer = generateImage(templateType, singleData);

                    if (imageBuffer) {
                      const caption = `📊 *${result.command.toUpperCase().replace("!", "")} - ${divisionLabel}*\n\nKirim dari IDOL META Bot • Kotabaru Pride`;

                      const imgRes = await sendMessageSafe(jid, {
                        image: imageBuffer,
                        caption: caption,
                        mimetype: 'image/png',
                      }, 30000);

                      if (imgRes.success) {
                        console.log(`[WhatsApp Bot] ✅ Sent ${divisionLabel} image to ${jid} (${imageBuffer.length} bytes)`);
                      } else {
                        // Fallback to text
                        console.log(`[WhatsApp Bot] ⚠️ Image failed, sending text fallback for ${divisionLabel}`);
                        await sendMessageSafe(jid, { text: result.reply });
                      }
                    }
                  }
                } else {
                  // Single image
                  const imageBuffer = generateImage(templateType, imageData);
                  if (imageBuffer) {
                    console.log(`[WhatsApp Bot] 📸 Sending image for ${result.command} to ${jid} (${imageBuffer.length} bytes)`);

                    const caption = `📊 *${result.command.toUpperCase().replace("!", "")}*\n\nKirim dari IDOL META Bot • Kotabaru Pride`;
                    const imgRes = await sendMessageSafe(jid, {
                      image: imageBuffer,
                      caption: caption,
                      mimetype: 'image/png',
                    }, 30000);

                    if (imgRes.success) {
                      console.log(`[WhatsApp Bot] ✅ Image sent to ${jid}`);
                    } else {
                      // Fallback to text
                      console.log(`[WhatsApp Bot] ⚠️ Image failed, sending text fallback`);
                      await sendMessageSafe(jid, { text: result.reply });
                    }
                  } else {
                    // Image generation failed — fallback to text
                    console.log(`[WhatsApp Bot] ⚠️ Image generation failed for ${result.command}`);
                    await sendMessageSafe(jid, { text: result.reply });
                  }
                }
              } else {
                // No data available for image — send text fallback
                console.log(`[WhatsApp Bot] 📤 No image data, sending text fallback to ${jid}`);
                await sendMessageSafe(jid, { text: result.reply });
              }
            }
          } else {
            // Non-image command — send text reply
            console.log(`[WhatsApp Bot] 📤 Sending text reply to ${jid}`);
            const sendResult = await sendMessageSafe(jid, { text: result.reply });
            if (sendResult.success) {
              console.log(`[WhatsApp Bot] ✅ Text message sent to ${jid}`);
            } else {
              console.error(`[WhatsApp Bot] ❌ Failed to send to ${jid}: ${sendResult.error}`);
            }
          }
        } catch (err) {
          const errorMsg = (err as Error).message;
          console.error(`[WhatsApp Bot] ❌ Unexpected error for ${jid}:`, errorMsg);
        }
      } catch (err) {
        console.error(`[WhatsApp Bot] Error processing command "${cmd}":`, (err as Error).message);

        totalCommandsProcessed++;
        addMessage({
          direction: 'inbound',
          from: senderPhone,
          to: 'bot',
          message: text,
          command: cmd,
          commandResponse: '❌ Terjadi kesalahan internal.',
          phone: senderPhone,
        });

        addActivityLog({
          command: cmd,
          sender: senderPhone,
          replyPreview: `ERROR: ${(err as Error).message}`,
          success: false,
        });

        try {
          await sock?.sendMessage(jid, {
            text: '❌ Terjadi kesalahan internal. Silakan coba lagi nanti.\n\n💡 Jika masalah berlanjut, hubungi admin.',
          });
        } catch (sendErr) {
          console.error('[WhatsApp Bot] Failed to send error reply:', (sendErr as Error).message);
        }
      }
    });

  } catch (err) {
    connectionState = 'disconnected';
    console.error('[WhatsApp Bot] ❌ Failed to initialize Baileys:', (err as Error).message);
    console.log('[WhatsApp Bot] Retrying in 10s...');
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => { reconnectTimer = null; startBaileysConnection(); }, 10_000);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function badRequest(message: string): Response {
  return jsonResponse({ success: false, error: message }, 400);
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET / — Health check with connection status, QR status, and stats
 */
function handleRoot(): Response {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  return jsonResponse({
    status: 'ok',
    service: 'IDOL META - WhatsApp Bot (Tournament Assistant)',
    version: '5.0.0',
    port: PORT,
    connection: {
      state: connectionState,
      qrAvailable: lastQrCode !== null,
      connected: connectionState === 'connected',
    },
    uptime: uptimeSeconds,
    totalCommands: totalCommandsProcessed,
    messagesStored: messages.length,
    rateLimitedUsers: getRateLimitedCount(),
    dbConnected: isDbAvailable(),
    commandCount: ALL_COMMANDS.length,
    activityLogsStored: activityLogs.length,
    docs: {
      health: 'GET / or GET /api/health',
      qr: 'GET /qr?format=png|json',
      test: 'POST /api/test',
      send: 'POST /api/send',
      webhook: 'POST /api/whatsapp/webhook',
      messages: 'GET /api/whatsapp/messages?type=logs|messages',
    },
    commands: ALL_COMMANDS,
  });
}

/**
 * GET /qr — Return QR code as PNG image or JSON
 */
async function handleQr(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'png';

  if (connectionState === 'connected') {
    return jsonResponse({
      connected: true,
      state: connectionState,
      qr: null,
      message: 'WhatsApp is already connected. No QR needed.',
    });
  }

  if (!lastQrCode) {
    return jsonResponse({
      connected: false,
      state: connectionState,
      qr: null,
      message: connectionState === 'connecting'
        ? 'Connecting to WhatsApp... Please wait.'
        : 'No QR code available. Please wait or restart the bot.',
    }, 202);
  }

  if (format === 'json') {
    return jsonResponse({
      connected: false,
      state: connectionState,
      qr: lastQrCode,
      message: 'Scan this QR code with WhatsApp → Linked Devices → Link a Device',
    });
  }

  // Default: PNG image
  try {
    const qrBuffer = await QRCode.toBuffer(lastQrCode, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return new Response(qrBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[WhatsApp Bot] QR code generation failed:', (err as Error).message);
    return jsonResponse({
      success: false,
      error: 'Failed to generate QR image',
    }, 500);
  }
}

/**
 * GET /api/health — Health check (for Next.js bot status API compatibility)
 */
function handleApiHealth(): Response {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  return jsonResponse({
    status: 'ok',
    platform: 'whatsapp',
    port: PORT,
    uptime: uptimeSeconds,
    totalCommands: totalCommandsProcessed,
    messagesStored: messages.length,
    rateLimitedUsers: getRateLimitedCount(),
    dbConnected: isDbAvailable(),
    commands: ALL_COMMANDS.map((c) => c.cmd),
    commandCount: ALL_COMMANDS.length,
    activityLogsStored: activityLogs.length,
    connection: {
      state: connectionState,
      connected: connectionState === 'connected',
    },
    rateLimit: {
      maxRequests: RATE_LIMIT_MAX,
      windowSeconds: RATE_LIMIT_WINDOW_MS / 1000,
    },
  });
}

/**
 * POST /api/test — Process a command and return result (for BotManagementTab testing)
 */
async function handleTest(req: Request): Promise<Response> {
  let body: { command?: string; senderPhone?: string; senderJid?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const { command, senderPhone, senderJid } = body;

  if (!command || typeof command !== 'string') {
    return badRequest("'command' is required and must be a string.");
  }

  const phone = senderPhone || 'test_user';
  const jid = senderJid || `${phone}@s.whatsapp.net`;
  const { cmd, args } = parseCommand(command);
  const result = await Promise.resolve(processCommand(command, phone, jid));

  totalCommandsProcessed++;
  addActivityLog({
    command: result.command,
    sender: phone,
    replyPreview: result.reply.substring(0, 100),
    success: true,
  });

  // Indicate image support for image commands
  const isImageCommand = IMAGE_COMMANDS.has(result.command);
  const isClubDetail = result.command === "!club" && (body.senderArgs || args || "").trim().length > 0;

  return jsonResponse({
    success: true,
    command: result.command,
    reply: result.reply,
    imageSupported: isImageCommand && !isClubDetail,
    note: (isImageCommand && !isClubDetail)
      ? `📸 This command supports premium image templates. Sent via WhatsApp will include a PNG image.`
      : undefined,
  });
}

/**
 * POST /api/send — Send a message to a specific phone number via Baileys
 */
async function handleSend(req: Request): Promise<Response> {
  let body: { to?: string; message?: string; tournamentId?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const { to, message, tournamentId } = body;

  if (!to || typeof to !== 'string') {
    return badRequest("'to' is required and must be a string (phone number or 'broadcast').");
  }
  if (!message || typeof message !== 'string') {
    return badRequest("'message' is required and must be a string.");
  }

  const isBroadcast = to.toLowerCase() === 'broadcast';

  if (isBroadcast) {
    const stored = addMessage({
      direction: 'outbound',
      to: 'broadcast',
      from: 'bot',
      message,
      tournamentId,
    });

    console.log(
      `[WhatsApp Bot] 📢 BROADCAST → msg="${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"${tournamentId ? ` | tournament=${tournamentId}` : ''}`
    );

    return jsonResponse({
      success: true,
      type: 'broadcast',
      message: 'Broadcast message stored successfully.',
      data: { id: stored.id, to: 'broadcast', message: stored.message, timestamp: stored.timestamp },
    });
  }

  // Try to send via Baileys if connected
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

  try {
    if (sock && connectionState === 'connected') {
      const result = await sendMessageSafe(jid, { text: message });
      if (result.success) {
        console.log(`[WhatsApp Bot] 📤 SENT via Baileys → to=${jid} | msg="${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"`);
      } else {
        console.error(`[WhatsApp Bot] ❌ Failed to send via Baileys to ${jid}: ${result.error}`);
        // Return error response instead of silently storing
        return jsonResponse({
          success: false,
          error: result.error,
          hint: 'Group messaging may require participants to have active sessions. Try sending a message in the group first to establish sessions.',
        }, 500);
      }
    } else {
      console.log(`[WhatsApp Bot] ⚠️ WhatsApp not connected — message stored but not sent via Baileys → to=${jid}`);
      return jsonResponse({
        success: false,
        error: 'WhatsApp not connected',
        hint: 'Please wait for the bot to connect to WhatsApp',
      }, 503);
    }
  } catch (err) {
    console.error(`[WhatsApp Bot] Failed to send via Baileys to ${jid}:`, (err as Error).message);
    return jsonResponse({
      success: false,
      error: (err as Error).message,
    }, 500);
  }

  const stored = addMessage({
    direction: 'outbound',
    to,
    from: 'bot',
    message,
    tournamentId,
  });

  return jsonResponse({
    success: true,
    message: 'Message sent successfully.',
    deliveredVia: 'baileys',
    data: { id: stored.id, to: stored.to, message: stored.message, timestamp: stored.timestamp },
  });
}

/**
 * POST /api/whatsapp/webhook — Fallback webhook endpoint
 */
async function handleWebhook(req: Request): Promise<Response> {
  let body: WebhookPayload;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const { from, message } = body;
  if (!from || !message) {
    return badRequest("'from' and 'message' are required.");
  }

  if (isCommand(message)) {
    const result = await Promise.resolve(processCommand(message, from));
    totalCommandsProcessed++;

    addMessage({
      direction: 'inbound', from, to: 'bot', message,
      command: result.command, commandResponse: result.reply, phone: from,
    });

    addActivityLog({
      command: result.command, sender: from,
      replyPreview: result.reply.substring(0, 100), success: true,
    });

    return jsonResponse({ success: true, type: 'command', command: result.command, reply: result.reply });
  }

  const stored = addMessage({ direction: 'inbound', from, to: 'bot', message });
  return jsonResponse({ success: true, type: 'chat', data: { id: stored.id, from: stored.from, timestamp: stored.timestamp } });
}

/**
 * GET /api/whatsapp/messages — List recent messages + activity logs
 */
function handleGetMessages(req: Request): Response {
  const url = new URL(req.url);
  const tournamentId = url.searchParams.get('tournamentId');
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '50', 10), 1), 200);
  const direction = url.searchParams.get('direction');
  const type = url.searchParams.get('type');

  if (type === 'logs') {
    const sender = url.searchParams.get('sender');
    let filtered = [...activityLogs];
    if (sender) filtered = filtered.filter((l) => l.sender === sender);
    return jsonResponse({ success: true, count: filtered.slice(0, limit).length, total: filtered.length, logs: filtered.slice(0, limit) });
  }

  let filtered = [...messages];
  if (tournamentId) filtered = filtered.filter((m) => m.tournamentId === tournamentId);
  if (direction) filtered = filtered.filter((m) => m.direction === direction);
  const broadcast = url.searchParams.get('broadcast');
  if (broadcast === 'true') filtered = filtered.filter((m) => m.to === 'broadcast');
  const commandsOnly = url.searchParams.get('commands');
  if (commandsOnly === 'true') filtered = filtered.filter((m) => m.command);

  const result = filtered.slice(0, limit);
  return jsonResponse({ success: true, count: result.length, total: filtered.length, messages: result });
}

/**
 * GET /api/whatsapp/health — Legacy health check
 */
function handleHealth(): Response {
  return handleApiHealth();
}

/**
 * POST /api/reset-auth — Reset auth folder to force QR re-scan
 * This is needed when Signal sessions become corrupted or invalid
 */
async function handleResetAuth(): Promise<Response> {
  try {
    const fs = await import('fs');
    const authPath = AUTH_DIR;

    console.log('[WhatsApp Bot] 🔄 Resetting auth folder...');

    // Disconnect first
    if (sock) {
      try {
        await sock?.logout();
        console.log('[WhatsApp Bot] 📴 Logged out from WhatsApp');
      } catch {
        // Ignore logout errors
      }
      sock = null;
    }
    connectionState = 'disconnected';
    lastQrCode = null;

    // Delete auth folder
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('[WhatsApp Bot] 🗑️ Auth folder deleted');
    }

    // Recreate empty auth folder
    fs.mkdirSync(authPath, { recursive: true });
    console.log('[WhatsApp Bot] 📁 New auth folder created');

    // Reconnect to get new QR
    setTimeout(() => {
      startBaileysConnection();
    }, 1000);

    return jsonResponse({
      success: true,
      message: 'Auth folder reset. Please scan the new QR code.',
      note: 'GET /qr?format=png to get the new QR code',
    });
  } catch (err) {
    console.error('[WhatsApp Bot] Failed to reset auth:', (err as Error).message);
    return jsonResponse({
      success: false,
      error: `Failed to reset auth: ${(err as Error).message}`,
    }, 500);
  }
}

/**
 * GET /api/meta/config — Get Meta API configuration
 */
function handleMetaConfig(): Response {
  return jsonResponse({
    success: true,
    config: {
      enabled: metaApiConfig.enabled,
      phoneNumberId: metaApiConfig.phoneNumberId ? `${metaApiConfig.phoneNumberId.substring(0, 5)}...` : null,
      businessAccountId: metaApiConfig.businessAccountId ? `${metaApiConfig.businessAccountId.substring(0, 5)}...` : null,
      hasAccessToken: !!metaApiConfig.accessToken,
      hasAppSecret: !!metaApiConfig.appSecret,
    },
  });
}

/**
 * POST /api/meta/config — Update Meta API configuration
 */
async function handleMetaConfigUpdate(req: Request): Promise<Response> {
  try {
    const body = await req.json() as {
      accessToken?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
      webhookVerifyToken?: string;
      appSecret?: string;
      enabled?: boolean;
    };

    // Update in-memory config
    if (body.accessToken !== undefined) metaApiConfig.accessToken = body.accessToken;
    if (body.phoneNumberId !== undefined) metaApiConfig.phoneNumberId = body.phoneNumberId;
    if (body.businessAccountId !== undefined) metaApiConfig.businessAccountId = body.businessAccountId;
    if (body.webhookVerifyToken !== undefined) metaApiConfig.webhookVerifyToken = body.webhookVerifyToken;
    if (body.appSecret !== undefined) metaApiConfig.appSecret = body.appSecret;
    if (body.enabled !== undefined) metaApiConfig.enabled = body.enabled;

    // Save to database via main app API
    const result = await postToMainApp('api/whatsapp/settings', {
      metaAccessToken: metaApiConfig.accessToken,
      metaPhoneNumberId: metaApiConfig.phoneNumberId,
      metaBusinessAccountId: metaApiConfig.businessAccountId,
      metaWebhookVerifyToken: metaApiConfig.webhookVerifyToken,
      metaAppSecret: metaApiConfig.appSecret,
      metaApiEnabled: metaApiConfig.enabled,
    });

    if (!result.ok) {
      console.error('[WhatsApp Bot] Failed to save Meta API config to DB:', result.error);
    }

    console.log(`[WhatsApp Bot] 📋 Meta API config updated: enabled=${metaApiConfig.enabled}`);

    return jsonResponse({
      success: true,
      message: 'Meta API configuration updated',
      config: {
        enabled: metaApiConfig.enabled,
        hasAccessToken: !!metaApiConfig.accessToken,
        phoneNumberId: metaApiConfig.phoneNumberId,
      },
    });
  } catch (err) {
    console.error('[WhatsApp Bot] Failed to update Meta API config:', (err as Error).message);
    return jsonResponse({
      success: false,
      error: `Failed to update config: ${(err as Error).message}`,
    }, 500);
  }
}

/**
 * POST /api/meta/test — Test Meta API connection
 */
async function handleMetaTest(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { to?: string };
    const testPhone = body.to || '6281255479410'; // Default test number

    if (!metaApiConfig.enabled || !metaApiConfig.accessToken || !metaApiConfig.phoneNumberId) {
      return jsonResponse({
        success: false,
        error: 'Meta API not configured. Please set accessToken and phoneNumberId first.',
      }, 400);
    }

    // Send test message
    const result = await sendMetaApiMessage(testPhone, '🤖 Test dari IDOL META Bot - Meta API terhubung!');

    return jsonResponse({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: `Test failed: ${(err as Error).message}`,
    }, 500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER
// ═══════════════════════════════════════════════════════════════════════════

// Initialize database connection on startup
getDb();
// Load Meta API configuration from database
loadMetaApiConfig();

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    try {
      const url = new URL(req.url);
      const { pathname } = url;

      // CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // GET / — Health check + connection status
      if (pathname === '/' && req.method === 'GET') {
        return handleRoot();
      }

      // GET /qr — QR code
      if (pathname === '/qr' && req.method === 'GET') {
        return await handleQr(req);
      }

      // GET /api/health — Health check (Next.js compatibility)
      if (pathname === '/api/health' && req.method === 'GET') {
        return handleApiHealth();
      }

      // POST /api/test — Test command (BotManagementTab)
      if (pathname === '/api/test' && req.method === 'POST') {
        return await handleTest(req);
      }

      // POST /api/send — Send message
      if (pathname === '/api/send' && req.method === 'POST') {
        return await handleSend(req);
      }

      // POST /api/whatsapp/webhook — Fallback webhook
      if (pathname === '/api/whatsapp/webhook' && req.method === 'POST') {
        return await handleWebhook(req);
      }

      // GET /api/whatsapp/messages — Messages list
      if (pathname === '/api/whatsapp/messages' && req.method === 'GET') {
        return handleGetMessages(req);
      }

      // GET /api/whatsapp/health — Legacy health
      if (pathname === '/api/whatsapp/health' && req.method === 'GET') {
        return handleHealth();
      }

      // GET /api/logs — Console logs for debugging
      if (pathname === '/api/logs' && req.method === 'GET') {
        const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '100', 10), 500);
        return jsonResponse({
          success: true,
          count: consoleLogs.slice(-limit).length,
          total: consoleLogs.length,
          logs: consoleLogs.slice(-limit),
        });
      }

      // POST /api/reset-auth — Reset auth folder to force QR re-scan
      if (pathname === '/api/reset-auth' && req.method === 'POST') {
        return await handleResetAuth();
      }

      // GET /api/meta/config — Get Meta API configuration
      if (pathname === '/api/meta/config' && req.method === 'GET') {
        return handleMetaConfig();
      }

      // POST /api/meta/config — Update Meta API configuration
      if (pathname === '/api/meta/config' && req.method === 'POST') {
        return await handleMetaConfigUpdate(req);
      }

      // POST /api/meta/test — Test Meta API connection
      if (pathname === '/api/meta/test' && req.method === 'POST') {
        return await handleMetaTest(req);
      }

      return jsonResponse({ success: false, error: 'Not Found' }, 404);
    } catch (error) {
      console.error('[WhatsApp Bot] Unhandled error:', error);
      return jsonResponse({ success: false, error: 'Internal Server Error' }, 500);
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════

console.log(`[WhatsApp Bot] 🚀 WhatsApp Bot v5.0 — Baileys + Premium Image Templates`);
console.log(`[WhatsApp Bot] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`[WhatsApp Bot] HTTP Server running on port ${PORT}`);
console.log(`[WhatsApp Bot] Endpoints:`);
console.log(`[WhatsApp Bot]   GET  /                     → Health check + connection status`);
console.log(`[WhatsApp Bot]   GET  /qr?format=png|json    → QR code for pairing`);
console.log(`[WhatsApp Bot]   GET  /api/health            → Health check (API)`);
console.log(`[WhatsApp Bot]   POST /api/test              → Test command`);
console.log(`[WhatsApp Bot]   POST /api/send              → Send message to phone`);
console.log(`[WhatsApp Bot]   POST /api/whatsapp/webhook   → Fallback webhook`);
console.log(`[WhatsApp Bot]   GET  /api/whatsapp/messages  → Messages + activity logs`);
console.log(`[WhatsApp Bot]   GET  /api/whatsapp/health    → Legacy health`);
console.log(`[WhatsApp Bot] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`[WhatsApp Bot] Features:`);
console.log(`[WhatsApp Bot]   Baileys: Direct WhatsApp Web connection`);
console.log(`[WhatsApp Bot]   Auth: ${AUTH_DIR}`);
console.log(`[WhatsApp Bot]   Rate Limiting: ${RATE_LIMIT_MAX} commands / ${RATE_LIMIT_WINDOW_MS / 1000}s per phone`);
console.log(`[WhatsApp Bot]   Activity Logging: in-memory (max ${MAX_ACTIVITY_LOGS} entries)`);
console.log(`[WhatsApp Bot]   Fuzzy Suggestions: auto-suggest on unknown commands`);
console.log(`[WhatsApp Bot] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`[WhatsApp Bot] Commands (${ALL_COMMANDS.length}):`);
for (const { cmd, desc } of ALL_COMMANDS) {
  console.log(`[WhatsApp Bot]   ${cmd.padEnd(32)} ${desc}`);
}
console.log(`[WhatsApp Bot] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

// Start Baileys connection
startBaileysConnection().catch(e => console.error('[WhatsApp Bot] Fatal connection error:', e));
