/**
 * IDOL META - WhatsApp Bot Service (Prisma + Supabase Version)
 *
 * A Baileys-powered WhatsApp bot for Railway deployment
 * Connects to Supabase PostgreSQL via Prisma
 *
 * Port: configurable (Railway sets PORT env)
 * Language: Bahasa Indonesia
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT & CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT || "6002", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const COMMAND_PREFIX = process.env.BOT_PREFIX || "!";
const SERVER_START_TIME = Date.now();

// Rate limiting
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "5", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "30000", 10);

// ═══════════════════════════════════════════════════════════════════════════
// PINO PATCH — Fix Baileys compatibility
// ═══════════════════════════════════════════════════════════════════════════

const noop = function(..._a: any[]) {};
const patchLogger = (logger: any): any => {
  if (!logger) return logger;
  if (typeof logger.trace !== 'function') logger.trace = noop;
  if (typeof logger.debug !== 'function') logger.debug = noop;
  if (logger.child) {
    const origChild = logger.child.bind(logger);
    logger.child = function(...args: any[]) {
      const child = origChild(...args);
      return patchLogger(child);
    };
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
    }
  }
  console.log("[WhatsApp Bot] 🔧 Pino patched for Baileys compatibility");
} catch {
  console.log("[WhatsApp Bot] ⚠️ Could not patch pino");
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════

import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import * as db from "./db-queries";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface StoredMessage {
  id: string;
  direction: "outbound" | "inbound";
  to: string;
  from: string;
  message: string;
  timestamp: string;
}

interface CommandResult {
  reply: string;
  command: string;
  isAsync?: boolean;
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
// IN-MEMORY STORES
// ═══════════════════════════════════════════════════════════════════════════

const messages: StoredMessage[] = [];
const activityLogs: ActivityLog[] = [];
const consoleLogs: string[] = [];
let messageCounter = 0;
let totalCommandsProcessed = 0;

const MAX_MESSAGES = 1000;
const MAX_ACTIVITY_LOGS = 2000;
const MAX_CONSOLE_LOGS = 500;

// Console log capture
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

// Rate limiter
interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  let entry = rateLimitMap.get(phone);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(phone, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.timestamps.push(now);
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function generateId(): string {
  messageCounter++;
  return `msg_${Date.now()}_${messageCounter}`;
}

function formatMoney(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
}

function normalizePhoneNumber(input: string): string {
  if (!input) return '';
  let phone = input.replace(/@(s\.whatsapp\.net|lid|g\.us|broadcast|newsletter)$/, '');
  phone = phone.replace(/[^\d+]/g, '');
  if (phone.startsWith('+')) phone = phone.substring(1);
  return phone;
}

function isLidId(input: string): boolean {
  if (input.includes('@lid')) return true;
  const normalized = input.replace(/[^\d]/g, '');
  if (normalized.length >= 14 && normalized.startsWith('1')) return true;
  return false;
}

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

function getTierIcon(tier: string): string {
  switch (tier?.toUpperCase()) {
    case "S": return "🌟";
    case "A": return "⭐";
    default: return "🔵";
  }
}

function parseCommand(raw: string): { cmd: string; args: string } {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const spaceIdx = lower.indexOf(" ");
  if (spaceIdx === -1) return { cmd: lower, args: "" };
  return { cmd: lower.substring(0, spaceIdx), args: trimmed.substring(spaceIdx + 1).trim() };
}

function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const day = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
    return `📅 ${day} ⏰ ${time}`;
  } catch { return ""; }
}

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP CONNECTION STATE
// ═══════════════════════════════════════════════════════════════════════════

let socket: ReturnType<typeof makeWASocket> | null = null;
let latestQR: string | null = null;
let connectionStatus: "connected" | "disconnected" | "qr_required" = "disconnected";

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

async function cmdBantuan(): Promise<CommandResult> {
  const lines = [
    "🎮 *IDOL META BOT*",
    "✨ Asisten Turnamen Esports",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    "🏆 *PERINTAH TURNAMEN*",
    "   ▸ !status - Status turnamen",
    "   ▸ !jadwal - Jadwal pertandingan",
    "   ▸ !hasil - Hasil pertandingan",
    "   ▸ !bracket [divisi] - Bracket",
    "   ▸ !peringkat [divisi] - Top 10",
    "   ▸ !juara [divisi] - Daftar juara",
    "   ▸ !hadiah - Total hadiah",
    "",
    "👥 *PERINTAH PEMAIN*",
    "   ▸ !daftar <nama> [divisi] [club]",
    "   ▸ !akun - Status pendaftaran",
    "   ▸ !pemain [divisi] - Daftar pemain",
    "   ▸ !profil <nama> - Profil pemain",
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
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "✨ *Powered by IDOL META*",
  ];
  return { command: "!bantuan", reply: lines.join("\n") };
}

async function cmdStatus(): Promise<CommandResult> {
  const isAvailable = await db.isDbAvailable();
  if (!isAvailable) {
    return {
      command: "!status",
      reply: "⚠️ Database tidak tersedia saat ini.\n\nℹ️ Coba lagi nanti atau hubungi admin."
    };
  }

  const tournaments = await db.getTournaments(6);

  if (tournaments.length === 0) {
    return {
      command: "!status",
      reply: "📋 Belum ada turnamen yang dibuat.\n\n💡 Hubungi admin untuk membuat turnamen baru."
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
      setup: "🔧", registration: "📝", ongoing: "🔴", completed: "✅"
    };
    const icon = statusEmoji[t.status] || "❓";
    const divIcon = t.division === "male" ? "♂️" : "♀️";
    const week = t.week ? `Week ${t.week}` : "";

    lines.push(`${icon} *${t.name}*`);
    lines.push(`   ${divIcon} ${t.division.toUpperCase()} ${week ? `• ${week}` : ""}`);
    lines.push(`   🎯 Status: _${statusLabel(t.status)}_`);
    lines.push(`   💰 Prize: *${formatMoney(t.prizePool)}*`);
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

async function cmdPemain(args: string): Promise<CommandResult> {
  const division = args.toLowerCase().trim();

  if (division && division !== "male" && division !== "female") {
    return {
      command: "!pemain",
      reply: `❌ Divisi "${args.trim()}" tidak ditemukan.\n\n💡 Gunakan: !pemain male atau !pemain female`
    };
  }

  const tournament = await db.getTournamentByDivision(division || "male");
  if (!tournament) {
    return {
      command: "!pemain",
      reply: `📋 Belum ada turnamen divisi ${division === "female" ? "Female" : "Male"}.\n\n💡 Gunakan !daftar <nama> ${division} untuk mendaftar.`
    };
  }

  const registrations = await db.getRegistrations(tournament.id);
  const approved = registrations.filter(r => r.status === "approved");
  const pending = registrations.filter(r => r.status === "pending");

  const lines: string[] = [
    `👥 *DAFTAR PEMAIN*`,
    `${division === "female" ? "♀️" : "♂️"} ${division?.toUpperCase() || "MIXED"}`,
    `_${tournament.name}_`,
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  if (approved.length > 0) {
    lines.push(`✅ *Dikonfirmasi* (${approved.length})`);
    for (let i = 0; i < Math.min(approved.length, 15); i++) {
      const r = approved[i];
      const tierIcon = getTierIcon(r.tierAssigned || r.user.tier);
      const num = (i + 1).toString().padStart(2, "0");
      lines.push(`   ${num}. ${tierIcon} *${r.user.name}*`);
    }
    if (approved.length > 15) {
      lines.push(`   ⋯ +${approved.length - 15} lainnya`);
    }
    lines.push("");
  }

  if (pending.length > 0) {
    lines.push(`⏳ Menunggu: *${pending.length}* pemain`);
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`📊 Total: *${registrations.length}* pemain terdaftar`);

  return { command: "!pemain", reply: lines.join("\n") };
}

async function cmdHadiah(): Promise<CommandResult> {
  const stats = await db.getTotalStats();
  const totalPrize = await db.getTotalPrizePool();

  const lines = [
    "💰 *TOTAL HADIAH*",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `🏆 *Prize Pool: ${formatMoney(totalPrize)}*`,
    "",
    "📊 *Statistik:*",
    `   💵 Total Donasi: ${formatMoney(stats.totalDonations)}`,
    `   💝 Total Sawer: ${formatMoney(stats.totalSawers)}`,
    `   👥 Total Pemain: ${stats.totalPlayers}`,
    `   🎮 Match Selesai: ${stats.totalMatches}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "✨ Donasi Anda mendukung Season 2!",
  ];

  return { command: "!hadiah", reply: lines.join("\n") };
}

async function cmdPeringkat(args: string): Promise<CommandResult> {
  const division = args.toLowerCase().trim() as "male" | "female" | undefined;
  const rankings = await db.getRankings(division === "male" || division === "female" ? division : undefined, 10);

  if (rankings.length === 0) {
    return { command: "!peringkat", reply: "📋 Belum ada data peringkat." };
  }

  const lines: string[] = [
    "🏆 *PAPAN PERINGKAT*",
    division ? `${division === "female" ? "♀️" : "♂️"} ${division.toUpperCase()}` : "🎮 Semua Divisi",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  for (let i = 0; i < rankings.length; i++) {
    const r = rankings[i];
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    const tierIcon = getTierIcon(r.user.tier);
    lines.push(`${medal} ${tierIcon} *${r.user.name}*`);
    lines.push(`   📊 ${r.points} pts • W${r.wins}/L${r.losses}`);
    if (i < rankings.length - 1) lines.push("");
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("ℹ️ Top 12 lolos ke Grand Final");

  return { command: "!peringkat", reply: lines.join("\n") };
}

async function cmdTopDonasi(): Promise<CommandResult> {
  const donations = await db.getDonations(10);

  if (donations.length === 0) {
    return { command: "!topdonasi", reply: "📋 Belum ada donasi yang terkonfirmasi." };
  }

  // Group by donor
  const donorMap = new Map<string, number>();
  for (const d of donations) {
    const name = d.anonymous ? "Anonim" : (d.donorName || d.user?.name || "Anonim");
    donorMap.set(name, (donorMap.get(name) || 0) + d.amount);
  }

  const sorted = Array.from(donorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const lines: string[] = [
    "💰 *TOP 10 DONATUR*",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  for (let i = 0; i < sorted.length; i++) {
    const [name, amount] = sorted[i];
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    lines.push(`${medal} *${name}*`);
    lines.push(`   ${formatMoney(amount)}`);
    if (i < sorted.length - 1) lines.push("");
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push("✨ Terima kasih atas dukungannya!");

  return { command: "!topdonasi", reply: lines.join("\n") };
}

async function cmdMVP(): Promise<CommandResult> {
  const mvp = await db.getMVP();

  if (!mvp) {
    return { command: "!mvp", reply: "📋 Belum ada MVP yang ditunjuk." };
  }

  const lines = [
    "⭐ *MVP TURNAMEN*",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `👑 *${mvp.name}*`,
    `   ${getTierIcon(mvp.tier)} Tier ${mvp.tier}`,
    `   📊 ${mvp.points} pts`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "✨ Pemain berprestasi!",
  ];

  return { command: "!mvp", reply: lines.join("\n") };
}

async function cmdProfil(args: string): Promise<CommandResult> {
  if (!args.trim()) {
    return { command: "!profil", reply: "❌ Gunakan: !profil <nama>\n\n💡 Contoh: !profil Joko" };
  }

  const user = await db.getUserByName(args.trim());

  if (!user) {
    return { command: "!profil", reply: `❌ Pemain "${args.trim()}" tidak ditemukan.\n\n💡 Pastikan nama benar atau gunakan !pemain untuk melihat daftar.` };
  }

  const lines = [
    `👤 *PROFIL PEMAIN*`,
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `📛 *${user.name}*`,
    `   ${user.gender === "female" ? "♀️" : "♂️"} ${user.gender.toUpperCase()}`,
    `   ${getTierIcon(user.tier)} Tier ${user.tier}`,
    `   📊 ${user.points} pts`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
  ];

  return { command: "!profil", reply: lines.join("\n") };
}

async function cmdDaftar(args: string, phone: string, jid: string): Promise<CommandResult> {
  const tokens = args.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      command: "!daftar",
      reply: "❌ Gunakan: !daftar <nama> [divisi] [club]\n\n💡 Contoh:\n   !daftar Joko\n   !daftar Sari female\n   !daftar Joko male NEXUS"
    };
  }

  const name = tokens[0];
  const division = tokens[1]?.toLowerCase() === "female" ? "female" : "male";
  const clubName = tokens.length > 2 ? tokens.slice(2).join(" ") : undefined;

  // Get or create user
  const normalizedPhone = normalizePhoneNumber(phone);

  // Find club if specified
  let clubId: string | undefined;
  if (clubName) {
    const club = await db.getClub(clubName);
    if (club) clubId = club.id;
  }

  // Create or update user
  const user = await db.createOrUpdateUser({
    name,
    phone: normalizedPhone,
    whatsappJid: jid,
    gender: division,
    clubId
  });

  // Get tournament
  const tournament = await db.getTournamentByDivision(division);

  if (!tournament) {
    return {
      command: "!daftar",
      reply: `❌ Belum ada turnamen divisi ${division === "female" ? "Female" : "Male"}.\n\n💡 Hubungi admin untuk membuat turnamen.`
    };
  }

  // Register
  const result = await db.registerToTournament(user.id, tournament.id);

  if (!result.success) {
    return {
      command: "!daftar",
      reply: `⚠️ ${result.error}\n\n📋 Turnamen: ${tournament.name}`
    };
  }

  const lines = [
    "✅ *PENDAFTARAN BERHASIL*",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `🎮 *${tournament.name}*`,
    `${division === "female" ? "♀️" : "♂️"} Divisi ${division.toUpperCase()}`,
    "",
    `📛 Nama: *${user.name}*`,
    `📱 HP: ${normalizedPhone.substring(0, 4)}****${normalizedPhone.substring(normalizedPhone.length - 3)}`,
    `🏅 Tier: ${user.tier}`,
    "",
    "⏳ Status: *Menunggu Konfirmasi*",
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "ℹ️ Admin akan segera mengkonfirmasi pendaftaran Anda.",
  ];

  return { command: "!daftar", reply: lines.join("\n") };
}

async function cmdAkun(phone: string, jid: string): Promise<CommandResult> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const user = await db.getUserByJid(jid) || await db.getUserByPhone(normalizedPhone);

  if (!user) {
    return {
      command: "!akun",
      reply: "📋 Anda belum terdaftar.\n\n💡 Gunakan !daftar <nama> [divisi] untuk mendaftar."
    };
  }

  const lines = [
    "👤 *INFO AKUN ANDA*",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `📛 Nama: *${user.name}*`,
    `${user.gender === "female" ? "♀️" : "♂️"} Divisi ${user.gender.toUpperCase()}`,
    `${getTierIcon(user.tier)} Tier ${user.tier}`,
    `📊 ${user.points} pts`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "ℹ️ Ketik !pemain untuk melihat daftar pemain.",
  ];

  return { command: "!akun", reply: lines.join("\n") };
}

async function cmdDonasi(args: string, phone: string): Promise<CommandResult> {
  const tokens = args.split(/\s+/).filter(Boolean);

  if (tokens.length === 0 || isNaN(parseInt(tokens[0]))) {
    return {
      command: "!donasi",
      reply: "❌ Gunakan: !donasi <jumlah> [pesan]\n\n💡 Contoh: !donasi 50000 Semangat!"
    };
  }

  const amount = parseInt(tokens[0]);
  const message = tokens.length > 1 ? tokens.slice(1).join(" ") : undefined;

  const user = await db.getUserByPhone(normalizePhoneNumber(phone));

  const donation = await db.createDonation({
    userId: user?.id,
    donorName: user?.name,
    amount,
    message,
    anonymous: !user
  });

  const lines = [
    "💰 *DONASI DICATAT*",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `💵 Jumlah: *${formatMoney(amount)}*`,
    message ? `💌 Pesan: "${message}"` : "",
    "",
    "📋 Status: *Menunggu Pembayaran*",
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "ℹ️ Admin akan menghubungi Anda untuk pembayaran.",
    "",
    `🆔 ID: ${donation.id}`,
  ];

  return { command: "!donasi", reply: lines.join("\n") };
}

async function cmdSawer(args: string, phone: string): Promise<CommandResult> {
  const tokens = args.split(/\s+/).filter(Boolean);

  if (tokens.length === 0 || isNaN(parseInt(tokens[0]))) {
    return {
      command: "!sawer",
      reply: "❌ Gunakan: !sawer <jumlah> [pesan]\n\n💡 Contoh: !sawer 10000 Main bagus!"
    };
  }

  const amount = parseInt(tokens[0]);
  const message = tokens.length > 1 ? tokens.slice(1).join(" ") : undefined;

  const user = await db.getUserByPhone(normalizePhoneNumber(phone));
  const tournament = await db.getTournamentByDivision("male"); // Default to male tournament

  const sawer = await db.createSawer({
    tournamentId: tournament?.id,
    senderName: user?.name || `WA-${normalizePhoneNumber(phone).substring(0, 6)}`,
    amount,
    message
  });

  const lines = [
    "💝 *SAWER DICATAT*",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `💵 Jumlah: *${formatMoney(amount)}*`,
    message ? `💌 Pesan: "${message}"` : "",
    "",
    "📋 Status: *Menunggu Pembayaran*",
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "ℹ️ Admin akan menghubungi Anda untuk pembayaran.",
    "",
    `🆔 ID: ${sawer.id}`,
  ];

  return { command: "!sawer", reply: lines.join("\n") };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND ROUTER
// ═══════════════════════════════════════════════════════════════════════════

async function handleCommand(raw: string, phone: string, jid: string): Promise<CommandResult> {
  const { cmd, args } = parseCommand(raw);

  switch (cmd) {
    case "!bantuan":
    case "!help":
      return cmdBantuan();

    case "!status":
      return cmdStatus();

    case "!pemain":
      return cmdPemain(args);

    case "!hadiah":
      return cmdHadiah();

    case "!peringkat":
    case "!ranking":
      return cmdPeringkat(args);

    case "!topdonasi":
      return cmdTopDonasi();

    case "!topsawer":
      return cmdTopDonasi(); // Similar logic

    case "!mvp":
      return cmdMVP();

    case "!profil":
      return cmdProfil(args);

    case "!daftar":
      return cmdDaftar(args, phone, jid);

    case "!akun":
      return cmdAkun(phone, jid);

    case "!donasi":
      return cmdDonasi(args, phone);

    case "!sawer":
      return cmdSawer(args, phone);

    default:
      // Fuzzy match suggestions
      const commands = ["!bantuan", "!status", "!pemain", "!hadiah", "!peringkat", "!daftar", "!akun", "!donasi", "!sawer", "!mvp", "!profil"];
      const suggestions = commands.filter(c => c.includes(cmd.substring(1)) || cmd.includes(c.substring(1, 3)));

      if (suggestions.length > 0) {
        return {
          command: cmd,
          reply: `❓ Perintah tidak dikenali: *${cmd}*\n\n💡 Mungkin maksud Anda:\n${suggestions.map(s => `   ${s}`).join("\n")}\n\n📋 Ketik *!bantuan* untuk daftar perintah.`
        };
      }

      return {
        command: cmd,
        reply: `❓ Perintah tidak dikenali: *${cmd}*\n\n📋 Ketik *!bantuan* untuk daftar perintah.`
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP CONNECTION
// ═══════════════════════════════════════════════════════════════════════════

async function connectToWhatsApp() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  socket = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    getMessage: async () => ({ conversation: "" }),
  });

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = qr;
      connectionStatus = "qr_required";
      console.log("[WhatsApp Bot] 📱 QR code generated - scan to connect");

      // Update DB status
      await db.updateWhatsAppStatus("qr_required");
    }

    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("[WhatsApp Bot] ❌ Disconnected, reconnecting:", shouldReconnect);

      connectionStatus = "disconnected";
      await db.updateWhatsAppStatus("disconnected");

      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(), 5000);
      }
    }

    if (connection === "open") {
      console.log("[WhatsApp Bot] ✅ Connected to WhatsApp!");
      connectionStatus = "connected";
      latestQR = null;
      await db.updateWhatsAppStatus("connected");
    }
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const from = msg.key.remoteJid!;
      const phone = normalizePhoneNumber(from);
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

      if (!text.startsWith(COMMAND_PREFIX)) continue;

      // Rate limit check
      if (isRateLimited(phone)) {
        console.log(`[WhatsApp Bot] ⚠️ Rate limited: ${phone}`);
        continue;
      }

      console.log(`[WhatsApp Bot] 📩 Command from ${phone}: ${text.substring(0, 50)}...`);

      try {
        const result = await handleCommand(text, phone, from);

        // Send reply
        await socket?.sendMessage(from, { text: result.reply });

        // Log activity
        totalCommandsProcessed++;
        await db.logBotActivity({
          platform: "whatsapp",
          command: result.command,
          sender: phone,
          senderId: from,
          response: result.reply.substring(0, 200),
          success: true
        });

        console.log(`[WhatsApp Bot] ✅ Replied to ${phone}: ${result.command}`);
      } catch (err) {
        console.error(`[WhatsApp Bot] ❌ Error handling command:`, err);

        await db.logBotActivity({
          platform: "whatsapp",
          command: text.split(" ")[0],
          sender: phone,
          senderId: from,
          response: (err as Error).message,
          success: false
        });
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP SERVER
// ═══════════════════════════════════════════════════════════════════════════

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
        connection: connectionStatus,
        commandsProcessed: totalCommandsProcessed,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders });
    }

    // Status
    if (url.pathname === "/api/status") {
      return Response.json({
        connected: connectionStatus === "connected",
        status: connectionStatus,
        hasQR: !!latestQR,
        uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
        commandsProcessed: totalCommandsProcessed
      }, { headers: corsHeaders });
    }

    // QR Code
    if (url.pathname === "/api/qr") {
      if (!latestQR) {
        return Response.json({ error: "No QR available", status: connectionStatus }, { status: 400, headers: corsHeaders });
      }

      try {
        const qrImage = await QRCode.toDataURL(latestQR);
        return Response.json({ qr: qrImage, status: connectionStatus }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: "Failed to generate QR" }, { status: 500, headers: corsHeaders });
      }
    }

    // Send message (admin)
    if (url.pathname === "/api/send" && req.method === "POST") {
      const body = await req.json() as { to: string; message: string };

      if (!socket || connectionStatus !== "connected") {
        return Response.json({ error: "WhatsApp not connected" }, { status: 503, headers: corsHeaders });
      }

      try {
        let jid = body.to;
        if (!jid.includes("@")) {
          jid = `${body.to}@s.whatsapp.net`;
        }

        await socket.sendMessage(jid, { text: body.message });

        return Response.json({ success: true, to: jid }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: (err as Error).message }, { status: 500, headers: corsHeaders });
      }
    }

    // Broadcast (admin)
    if (url.pathname === "/api/broadcast" && req.method === "POST") {
      const body = await req.json() as { message: string; phones?: string[] };

      if (!socket || connectionStatus !== "connected") {
        return Response.json({ error: "WhatsApp not connected" }, { status: 503, headers: corsHeaders });
      }

      const phones = body.phones || [];
      let sent = 0;
      let failed = 0;

      for (const phone of phones) {
        try {
          let jid = phone;
          if (!jid.includes("@")) {
            jid = `${phone}@s.whatsapp.net`;
          }
          await socket.sendMessage(jid, { text: body.message });
          sent++;
        } catch {
          failed++;
        }
      }

      return Response.json({ sent, failed, total: phones.length }, { headers: corsHeaders });
    }

    // Logs
    if (url.pathname === "/api/logs") {
      return Response.json({
        logs: consoleLogs.slice(-100),
        activities: activityLogs.slice(-50),
        commandsProcessed: totalCommandsProcessed
      }, { headers: corsHeaders });
    }

    // 404
    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════

console.log("════════════════════════════════════════════════════════════");
console.log("  🤖 IDOL META WhatsApp Bot - Railway Edition");
console.log("════════════════════════════════════════════════════════════");
console.log(`  🌐 HTTP Server: http://localhost:${PORT}`);
console.log(`  📱 Frontend URL: ${FRONTEND_URL}`);
console.log(`  📝 Command Prefix: ${COMMAND_PREFIX}`);
console.log("════════════════════════════════════════════════════════════");
console.log("");

// Connect to WhatsApp
connectToWhatsApp().catch(err => {
  console.error("[WhatsApp Bot] Failed to connect:", err);
});

console.log(`[WhatsApp Bot] 🚀 Server started on port ${PORT}`);
