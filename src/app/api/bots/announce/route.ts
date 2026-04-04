import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type AnnouncementType =
  | 'match_result'
  | 'match_live'
  | 'registration'
  | 'bracket'
  | 'final'
  | 'info'
  | 'warning'
  | 'mvp_update'
  | 'donation'
  | 'sawer';

interface AnnounceRequestBody {
  message: string;
  tournamentId?: string;
  type?: AnnouncementType;
}

interface BotSendResult {
  platform: string;
  success: boolean;
  status?: number;
  error?: string;
}

interface AnnounceResponse {
  success: boolean;
  results: BotSendResult[];
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const WHATSAPP_PORT = 6002;
const DISCORD_PORT = 6003;
const REQUEST_TIMEOUT_MS = 8000;

const VALID_ANNOUNCEMENT_TYPES: AnnouncementType[] = [
  'match_result', 'match_live', 'registration', 'bracket', 'final',
  'info', 'warning', 'mvp_update', 'donation', 'sawer',
];

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

async function sendToWhatsApp(
  message: string,
  type: AnnouncementType,
  tournamentId?: string
): Promise<BotSendResult> {
  const url = `http://localhost:${WHATSAPP_PORT}/api/whatsapp/send`;

  // Format WhatsApp message with type prefix
  const typeEmojis: Record<AnnouncementType, string> = {
    info: '📢 INFO',
    warning: '⚠️ PERINGATAN',
    match_result: '⚔️ HASIL PERTANDINGAN',
    match_live: '🔴 LIVE MATCH',
    registration: '📝 PENDAFTARAN',
    bracket: '🏆 BRACKET',
    final: '👑 FINAL',
    mvp_update: '🌟 MVP UPDATE',
    donation: '💝 DONASI',
    sawer: '💸 SAWER',
  };

  const formattedMessage = `[${typeEmojis[type]}]\n${message}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'broadcast',
        message: formattedMessage,
        tournamentId,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const body = await response.json().catch(() => ({}));

    return {
      platform: 'whatsapp',
      success: response.ok,
      status: response.status,
      error: response.ok ? undefined : body.error || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      platform: 'whatsapp',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reach WhatsApp bot',
    };
  }
}

async function sendToDiscord(
  message: string,
  tournamentId?: string,
  type?: AnnouncementType
): Promise<BotSendResult> {
  const url = `http://localhost:${DISCORD_PORT}/api/discord/announce`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId,
        type: type || 'info',
        data: { message, title: type || 'info' },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const body = await response.json().catch(() => ({}));

    return {
      platform: 'discord',
      success: response.ok,
      status: response.status,
      error: response.ok ? undefined : body.error || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      platform: 'discord',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reach Discord bot',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Route Handler
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/bots/announce
 *
 * Sends an announcement through both WhatsApp and Discord bots.
 * Supports 10 announcement types with formatted messages.
 *
 * Types: match_result, match_live, registration, bracket, final,
 *        info, warning, mvp_update, donation, sawer
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnnounceRequestBody = await request.json();
    const { message, tournamentId, type } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, results: [], message: 'Missing or empty "message" field.' },
        { status: 400 }
      );
    }

    if (type && !VALID_ANNOUNCEMENT_TYPES.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          results: [],
          message: `Invalid type "${type}". Valid: ${VALID_ANNOUNCEMENT_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const announceType = type || 'info';
    const trimmedMessage = message.trim();

    const [whatsappResult, discordResult] = await Promise.all([
      sendToWhatsApp(trimmedMessage, announceType, tournamentId),
      sendToDiscord(trimmedMessage, tournamentId, announceType),
    ]);

    const results = [whatsappResult, discordResult];
    const anySuccess = results.some((r) => r.success);
    const allSuccess = results.every((r) => r.success);

    const successes = results.filter((r) => r.success).map((r) => r.platform);
    const failures = results.filter((r) => !r.success);

    let summary: string;
    if (allSuccess) {
      summary = `Announcement sent to ${successes.join(' and ')} successfully.`;
    } else if (anySuccess) {
      summary = `Sent to ${successes.join(' and ')}, failed on ${failures.map((f) => f.platform).join(' and ')}.`;
    } else {
      summary = `Failed to send announcement to both platforms.`;
    }

    return NextResponse.json(
      { success: anySuccess, results, message: summary },
      { status: allSuccess ? 200 : anySuccess ? 207 : 500 }
    );
  } catch (error) {
    console.error('[Bot Announce] Error:', error);
    return NextResponse.json(
      { success: false, results: [], message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
