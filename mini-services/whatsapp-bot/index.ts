/**
 * IDOL META - WhatsApp Bot Service (Railway)
 * Simple version with better error handling
 */

const PORT = parseInt(process.env.PORT || "6002", 10);
const COMMAND_PREFIX = process.env.BOT_PREFIX || "!";
const SERVER_START_TIME = Date.now();

// Pino patch for Baileys
const noop = function(..._a: any[]) {};
try {
  const pinoMod = require("pino");
  if (pinoMod?.default) {
    if (typeof pinoMod.default.trace !== 'function') pinoMod.default.trace = noop;
    if (typeof pinoMod.default.debug !== 'function') pinoMod.default.debug = noop;
  }
  console.log("[Bot] Pino patched");
} catch {}

// Imports
import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import QRCode from "qrcode";

// Prisma import with error handling
let prisma: any = null;
let dbReady = false;

async function initDb() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    dbReady = true;
    console.log("[Bot] ✅ Database connected");
  } catch (err) {
    console.error("[Bot] ❌ Database connection failed:", (err as Error).message);
    dbReady = false;
  }
}

// State
let socket: any = null;
let latestQR: string | null = null;
let connectionStatus: "connected" | "disconnected" | "qr_required" = "disconnected";
let totalCommandsProcessed = 0;

// Helpers
function formatMoney(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function normalizePhone(input: string): string {
  return input.replace(/@(s\.whatsapp\.net|lid|g\.us)/, '').replace(/[^\d]/g, '');
}

// Command handlers
async function handleCommand(text: string, phone: string, jid: string): Promise<string> {
  const cmd = text.split(" ")[0].toLowerCase();
  const args = text.substring(cmd.length).trim();

  // Help
  if (cmd === "!bantuan" || cmd === "!help") {
    return `🎮 *IDOL META BOT*
✨ Asisten Turnamen Esports

🏆 *PERINTAH TURNAMEN*
   !status - Status turnamen
   !jadwal - Jadwal pertandingan
   !peringkat - Top 10 pemain
   !hadiah - Total hadiah

👥 *PERINTAH PEMAIN*
   !daftar <nama> [divisi]
   !akun - Info akun Anda
   !pemain - Daftar pemain
   !profil <nama> - Profil pemain
   !mvp - MVP saat ini

💰 *PERINTAH DONASI*
   !donasi <jumlah> [pesan]
   !sawer <jumlah> [pesan]

━━━━━━━━━━━━━━━━━━━━━
✨ Powered by IDOL META`;
  }

  // Status
  if (cmd === "!status") {
    if (!dbReady) return "⚠️ Database tidak tersedia.";

    try {
      const tournaments = await prisma.tournament.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { registrations: true, matches: true } } }
      });

      if (!tournaments.length) return "📋 Belum ada turnamen.";

      let msg = "🏆 *STATUS TURNAMEN*\n━━━━━━━━━━━━━━━━━━━━━\n\n";
      for (const t of tournaments) {
        const emoji = { setup: "🔧", registration: "📝", ongoing: "🔴", completed: "✅" }[t.status] || "❓";
        msg += `${emoji} *${t.name}*\n`;
        msg += `   ${t.division === "female" ? "♀️" : "♂️"} ${t.division.toUpperCase()}\n`;
        msg += `   💰 ${formatMoney(t.prizePool)}\n`;
        msg += `   👥 ${t._count.registrations} pemain\n\n`;
      }
      return msg;
    } catch (err) {
      return "❌ Error: " + (err as Error).message;
    }
  }

  // Pemain
  if (cmd === "!pemain") {
    if (!dbReady) return "⚠️ Database tidak tersedia.";

    try {
      const division = args.toLowerCase() === "female" ? "female" : "male";
      const tournament = await prisma.tournament.findFirst({
        where: { division },
        orderBy: { createdAt: 'desc' }
      });

      if (!tournament) return `📋 Belum ada turnamen ${division}.`;

      const regs = await prisma.registration.findMany({
        where: { tournamentId: tournament.id, status: "approved" },
        include: { user: true },
        take: 15,
        orderBy: { user: { name: 'asc' } }
      });

      let msg = `👥 *PEMAIN ${division.toUpperCase()}*\n_${tournament.name}_\n\n`;
      for (let i = 0; i < regs.length; i++) {
        const r = regs[i];
        const tier = r.tierAssigned || r.user.tier || "B";
        const icon = tier === "S" ? "🌟" : tier === "A" ? "⭐" : "🔵";
        msg += `${(i+1).toString().padStart(2,"0")}. ${icon} *${r.user.name}*\n`;
      }
      return msg + `\n📊 Total: ${regs.length} pemain`;
    } catch (err) {
      return "❌ Error: " + (err as Error).message;
    }
  }

  // Hadiah
  if (cmd === "!hadiah") {
    if (!dbReady) return "⚠️ Database tidak tersedia.";

    try {
      const tournament = await prisma.tournament.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      const sawerTotal = await prisma.sawer.aggregate({
        where: { paymentStatus: 'confirmed' },
        _sum: { amount: true }
      });

      const donasiTotal = await prisma.donation.aggregate({
        where: { paymentStatus: 'confirmed' },
        _sum: { amount: true }
      });

      const prize = (tournament?.prizePool || 0) + (sawerTotal._sum.amount || 0);

      return `💰 *TOTAL HADIAH*
━━━━━━━━━━━━━━━━━━━━━

🏆 Prize Pool: *${formatMoney(prize)}*
💝 Total Sawer: ${formatMoney(sawerTotal._sum.amount || 0)}
💵 Total Donasi: ${formatMoney(donasiTotal._sum.amount || 0)}

━━━━━━━━━━━━━━━━━━━━━
✨ Dukung Season 2!`;
    } catch (err) {
      return "❌ Error: " + (err as Error).message;
    }
  }

  // Peringkat
  if (cmd === "!peringkat" || cmd === "!ranking") {
    if (!dbReady) return "⚠️ Database tidak tersedia.";

    try {
      const users = await prisma.user.findMany({
        orderBy: { points: 'desc' },
        take: 10
      });

      if (!users.length) return "📋 Belum ada data peringkat.";

      let msg = "🏆 *PAPAN PERINGKAT*\n━━━━━━━━━━━━━━━━━━━━━\n\n";
      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
        const icon = u.tier === "S" ? "🌟" : u.tier === "A" ? "⭐" : "🔵";
        msg += `${medal} ${icon} *${u.name}*\n   📊 ${u.points} pts\n\n`;
      }
      return msg;
    } catch (err) {
      return "❌ Error: " + (err as Error).message;
    }
  }

  // Daftar
  if (cmd === "!daftar") {
    if (!args) return "❌ Gunakan: !daftar <nama> [divisi]\n💡 Contoh: !daftar Joko";

    if (!dbReady) return "⚠️ Database tidak tersedia.";

    try {
      const tokens = args.split(/\s+/);
      const name = tokens[0];
      const division = tokens[1]?.toLowerCase() === "female" ? "female" : "male";

      const tournament = await prisma.tournament.findFirst({
        where: { division },
        orderBy: { createdAt: 'desc' }
      });

      if (!tournament) return `❌ Belum ada turnamen ${division}.`;

      // Create/find user
      let user = await prisma.user.findFirst({
        where: { phone: normalizePhone(phone) }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name,
            email: `wa_${normalizePhone(phone)}@idolmeta.local`,
            phone: normalizePhone(phone),
            whatsappJid: jid,
            gender: division,
            tier: "B"
          }
        });
      }

      // Check existing registration
      const existing = await prisma.registration.findUnique({
        where: { userId_tournamentId: { userId: user.id, tournamentId: tournament.id } }
      });

      if (existing) {
        return existing.status === "approved"
          ? "✅ Anda sudah terdaftar!"
          : "⏳ Pendaftaran Anda masih menunggu konfirmasi.";
      }

      // Register
      await prisma.registration.create({
        data: { userId: user.id, tournamentId: tournament.id, status: "pending" }
      });

      return `✅ *PENDAFTARAN BERHASIL*

🎮 ${tournament.name}
${division === "female" ? "♀️" : "♂️"} Divisi ${division.toUpperCase()}

📛 Nama: *${name}*
⏳ Status: *Menunggu Konfirmasi*

━━━━━━━━━━━━━━━━━━━━━
Admin akan segera mengkonfirmasi.`;
    } catch (err) {
      return "❌ Error: " + (err as Error).message;
    }
  }

  // Akun
  if (cmd === "!akun") {
    if (!dbReady) return "⚠️ Database tidak tersedia.";

    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalizePhone(phone) },
            { whatsappJid: jid }
          ]
        }
      });

      if (!user) return "📋 Anda belum terdaftar.\n💡 Gunakan !daftar <nama> untuk mendaftar.";

      const icon = user.tier === "S" ? "🌟" : user.tier === "A" ? "⭐" : "🔵";
      return `👤 *INFO AKUN*
━━━━━━━━━━━━━━━━━━━━━

📛 Nama: *${user.name}*
${user.gender === "female" ? "♀️" : "♂️"} ${user.gender.toUpperCase()}
${icon} Tier ${user.tier}
📊 ${user.points} pts

━━━━━━━━━━━━━━━━━━━━━`;
    } catch (err) {
      return "❌ Error: " + (err as Error).message;
    }
  }

  // MVP
  if (cmd === "!mvp") {
    if (!dbReady) return "⚠️ Database tidak tersedia.";

    try {
      const mvp = await prisma.user.findFirst({ where: { isMVP: true } });
      if (!mvp) return "📋 Belum ada MVP.";

      const icon = mvp.tier === "S" ? "🌟" : mvp.tier === "A" ? "⭐" : "🔵";
      return `⭐ *MVP TURNAMEN*
━━━━━━━━━━━━━━━━━━━━━

👑 *${mvp.name}*
${icon} Tier ${mvp.tier}
📊 ${mvp.points} pts

━━━━━━━━━━━━━━━━━━━━━
✨ Pemain berprestasi!`;
    } catch (err) {
      return "❌ Error: " + (err as Error).message;
    }
  }

  // Profil
  if (cmd === "!profil") {
    if (!args) return "❌ Gunakan: !profil <nama>";

    if (!dbReady) return "⚠️ Database tidak tersedia.";

    try {
      const user = await prisma.user.findFirst({
        where: { name: { equals: args, mode: 'insensitive' } }
      });

      if (!user) return `❌ Pemain "${args}" tidak ditemukan.`;

      const icon = user.tier === "S" ? "🌟" : user.tier === "A" ? "⭐" : "🔵";
      return `👤 *PROFIL PEMAIN*
━━━━━━━━━━━━━━━━━━━━━

📛 *${user.name}*
${user.gender === "female" ? "♀️" : "♂️"} ${user.gender.toUpperCase()}
${icon} Tier ${user.tier}
📊 ${user.points} pts

━━━━━━━━━━━━━━━━━━━━━`;
    } catch (err) {
      return "❌ Error: " + (err as Error).message;
    }
  }

  // Default
  return `❓ Perintah tidak dikenali: *${cmd}*
📋 Ketik *!bantuan* untuk daftar perintah.`;
}

// WhatsApp connection
async function connectWhatsApp() {
  try {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      getMessage: async () => ({ conversation: "" }),
    });

    socket.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQR = qr;
        connectionStatus = "qr_required";

        // Generate ASCII QR code for logs
        try {
          const asciiQR = await QRCode.toString(qr, { type: 'terminal', small: true });
          console.log("\n");
          console.log("════════════════════════════════════════════════════════════");
          console.log("  📱 SCAN QR CODE WHATSAPP");
          console.log("════════════════════════════════════════════════════════════");
          console.log(asciiQR);
          console.log("════════════════════════════════════════════════════════════");
          console.log("  📱 Buka WhatsApp → Settings → Linked Devices → Scan");
          console.log("════════════════════════════════════════════════════════════");
          console.log("\n");
        } catch (e) {
          console.log("[Bot] 📱 QR generated - check /api/qr endpoint");
        }
      }

      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log("[Bot] ❌ Disconnected, reconnect:", shouldReconnect);
        connectionStatus = "disconnected";
        if (shouldReconnect) setTimeout(connectWhatsApp, 5000);
      }

      if (connection === "open") {
        console.log("[Bot] ✅ Connected!");
        connectionStatus = "connected";
        latestQR = null;
      }
    });

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("messages.upsert", async ({ messages }: any) => {
      for (const msg of messages) {
        if (msg.key.fromMe || !msg.message) continue;

        const from = msg.key.remoteJid;
        const phone = normalizePhone(from);
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (!text.startsWith(COMMAND_PREFIX)) continue;

        console.log(`[Bot] 📩 ${phone}: ${text.substring(0, 30)}...`);

        try {
          const reply = await handleCommand(text, phone, from);
          await socket.sendMessage(from, { text: reply });
          totalCommandsProcessed++;
          console.log(`[Bot] ✅ Replied to ${phone}`);
        } catch (err) {
          console.error("[Bot] ❌ Error:", (err as Error).message);
        }
      }
    });
  } catch (err) {
    console.error("[Bot] Connection error:", (err as Error).message);
    setTimeout(connectWhatsApp, 10000);
  }
}

// HTTP Server
const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);
    const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    // Health
    if (url.pathname === "/health" || url.pathname === "/") {
      return Response.json({
        status: "ok",
        uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
        connection: connectionStatus,
        commandsProcessed: totalCommandsProcessed,
        db: dbReady
      }, { headers: cors });
    }

    // Status
    if (url.pathname === "/api/status") {
      return Response.json({
        connected: connectionStatus === "connected",
        status: connectionStatus,
        hasQR: !!latestQR
      }, { headers: cors });
    }

    // QR (JSON)
    if (url.pathname === "/api/qr") {
      if (!latestQR) return Response.json({ error: "No QR", status: connectionStatus }, { status: 400, headers: cors });
      try {
        const qr = await QRCode.toDataURL(latestQR);
        return Response.json({ qr, status: connectionStatus }, { headers: cors });
      } catch (err) {
        return Response.json({ error: "QR failed" }, { status: 500, headers: cors });
      }
    }

    // QR Page (HTML)
    if (url.pathname === "/qr") {
      if (!latestQR) {
        return new Response(`
          <html>
            <head><title>IDOL META Bot</title></head>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;background:#1a1a2e;color:#fff;">
              <div style="text-align:center;">
                <h2>⏳ Menunggu QR Code...</h2>
                <p>Status: ${connectionStatus}</p>
                <p>Refresh halaman ini dalam beberapa detik</p>
              </div>
            </body>
          </html>
        `, { headers: { "Content-Type": "text/html" } });
      }
      try {
        const qr = await QRCode.toDataURL(latestQR);
        return new Response(`
          <html>
            <head>
              <title>IDOL META - WhatsApp Bot</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:Arial;background:#1a1a2e;color:#fff;margin:0;">
              <div style="text-align:center;padding:20px;">
                <h1 style="color:#e94560;">🎮 IDOL META</h1>
                <h2>WhatsApp Bot</h2>
                <div style="background:#fff;padding:20px;border-radius:16px;margin:20px 0;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                  <img src="${qr}" style="max-width:300px;width:100%;" />
                </div>
                <p style="color:#aaa;">📱 Scan dengan WhatsApp</p>
                <p style="font-size:12px;color:#666;">Settings → Linked Devices → Link a Device</p>
              </div>
            </body>
          </html>
        `, { headers: { "Content-Type": "text/html" } });
      } catch (err) {
        return Response.json({ error: "QR failed" }, { status: 500, headers: cors });
      }
    }

    // Send
    if (url.pathname === "/api/send" && req.method === "POST") {
      if (!socket || connectionStatus !== "connected") {
        return Response.json({ error: "Not connected" }, { status: 503, headers: cors });
      }
      try {
        const { to, message } = await req.json();
        const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
        await socket.sendMessage(jid, { text: message });
        return Response.json({ success: true, to: jid }, { headers: cors });
      } catch (err) {
        return Response.json({ error: (err as Error).message }, { status: 500, headers: cors });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404, headers: cors });
  }
});

// Start
console.log("════════════════════════════════════════════════════════════");
console.log("  🤖 IDOL META WhatsApp Bot");
console.log("════════════════════════════════════════════════════════════");
console.log(`  🌐 Port: ${PORT}`);
console.log("════════════════════════════════════════════════════════════");

// Init DB then connect WhatsApp
initDb().then(() => {
  connectWhatsApp();
});

console.log(`[Bot] 🚀 Server started on port ${PORT}`);
