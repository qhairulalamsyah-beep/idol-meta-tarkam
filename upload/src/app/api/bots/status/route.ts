import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface BotHealthResponse {
  status: 'online' | 'offline';
  uptime?: number;
  lastPing: string;
  port: number;
  error?: string;
  totalCommands?: number;
  messagesStored?: number;
  rateLimitedUsers?: number;
  dbConnected?: boolean;
}

interface StatusResponse {
  whatsapp: BotHealthResponse;
  discord: BotHealthResponse;
  logs: Array<{
    id: string;
    platform: string;
    command: string;
    sender: string;
    replyPreview: string;
    success: boolean;
    timestamp: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const WHATSAPP_PORT = 6002;
const DISCORD_PORT = 6003;
const HEALTH_TIMEOUT_MS = 5000;

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pings a bot's health endpoint and returns status information.
 * Passes through all health fields from the bot response.
 */
async function pingBotHealth(
  port: number,
  healthPath: string
): Promise<BotHealthResponse> {
  const url = `http://localhost:${port}${healthPath}`;
  const lastPing = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: 'offline',
        lastPing,
        port,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const body = await response.json().catch(() => ({}));

    return {
      status: 'online',
      uptime: body.uptime ?? body.upTime,
      lastPing,
      port,
      totalCommands: body.totalCommands ?? body.total_commands_processed ?? 0,
      messagesStored: body.messagesStored ?? body.messages_stored ?? 0,
      rateLimitedUsers: body.rateLimitedUsers ?? body.rate_limited_users ?? 0,
      dbConnected: body.dbConnected ?? body.db_connected ?? true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        status: 'offline',
        lastPing,
        port,
        error: `Timeout: bot did not respond within ${HEALTH_TIMEOUT_MS}ms`,
      };
    }

    return {
      status: 'offline',
      lastPing,
      port,
      error: message,
    };
  }
}

/**
 * Fetch in-memory activity logs from a bot's messages endpoint.
 */
async function fetchBotLogs(
  port: number,
  logsPath: string,
  platform: string
): Promise<Array<{ id: string; platform: string; command: string; sender: string; replyPreview: string; success: boolean; timestamp: string }>> {
  const url = `http://localhost:${port}${logsPath}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const body = await response.json().catch(() => ({}));
    const rawLogs = body.logs || body.activityLogs || body.activity_logs || [];

    return rawLogs.slice(0, 30).map((log: Record<string, unknown>) => ({
      id: (log.id as string) || `log_${Date.now()}_${Math.random()}`,
      platform,
      command: (log.command as string) || '-',
      sender: (log.sender as string) || (log.from as string) || 'Unknown',
      replyPreview: (log.replyPreview as string) || (log.reply_preview as string) || (log.commandResponse as string) || '',
      success: log.success !== false,
      timestamp: (log.timestamp as string) || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Route Handler
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/bots/status
 *
 * Returns the health status of both bots (with full metrics),
 * plus recent activity logs from each bot's in-memory store.
 */
export async function GET() {
  try {
    // Ping both bots and fetch their logs concurrently
    const [whatsappStatus, discordStatus, waLogs, dcLogs] = await Promise.all([
      pingBotHealth(WHATSAPP_PORT, '/api/whatsapp/health'),
      pingBotHealth(DISCORD_PORT, '/api/discord/health'),
      fetchBotLogs(WHATSAPP_PORT, '/api/whatsapp/messages?type=logs', 'whatsapp'),
      fetchBotLogs(DISCORD_PORT, '/api/discord/messages?type=logs', 'discord'),
    ]);

    // Merge and sort logs by timestamp (newest first)
    const allLogs = [...waLogs, ...dcLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    const response: StatusResponse = {
      whatsapp: whatsappStatus,
      discord: discordStatus,
      logs: allLogs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Bot Status] Error checking bot status:', error);

    return NextResponse.json(
      {
        error: 'Failed to check bot status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
