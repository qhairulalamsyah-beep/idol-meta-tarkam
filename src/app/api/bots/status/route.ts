import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { botLogger, apiLogger } from '@/lib/logger';

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
// Configuration (from environment, no hardcoded values)
// ═══════════════════════════════════════════════════════════════════════════

// Bot ports - should be configured via environment variables
const WHATSAPP_PORT = parseInt(process.env.WHATSAPP_BOT_PORT || '6002', 10);
const DISCORD_PORT = parseInt(process.env.DISCORD_BOT_PORT || '6003', 10);
const HEALTH_TIMEOUT_MS = parseInt(process.env.BOT_HEALTH_TIMEOUT_MS || '5000', 10);
const LOGS_TIMEOUT_MS = parseInt(process.env.BOT_LOGS_TIMEOUT_MS || '3000', 10);
const MAX_LOGS = parseInt(process.env.MAX_BOT_LOGS || '50', 10);

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
  const config = getConfig();
  
  // Use Railway URL in production, localhost in development
  const baseUrl = config.app.isProduction 
    ? config.bot.whatsappUrl 
    : `http://localhost:${port}`;
  
  const url = `${baseUrl}${healthPath}`;
  const lastPing = new Date().toISOString();

  botLogger.debug('Pinging bot health', { url, timeout: HEALTH_TIMEOUT_MS });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      botLogger.warn('Bot health check failed', { url, status: response.status });
      return {
        status: 'offline',
        lastPing,
        port,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const body = await response.json().catch(() => ({}));

    botLogger.debug('Bot health check passed', { url, status: 'online' });

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
      botLogger.warn('Bot health check timeout', { url, timeout: HEALTH_TIMEOUT_MS });
      return {
        status: 'offline',
        lastPing,
        port,
        error: `Timeout: bot did not respond within ${HEALTH_TIMEOUT_MS}ms`,
      };
    }

    botLogger.error('Bot health check error', error, { url });
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
  const config = getConfig();
  
  const baseUrl = config.app.isProduction 
    ? config.bot.whatsappUrl 
    : `http://localhost:${port}`;
  
  const url = `${baseUrl}${logsPath}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOGS_TIMEOUT_MS);

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
  const timer = apiLogger.startTimer();
  apiLogger.request('GET', '/api/bots/status');

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
      .slice(0, MAX_LOGS);

    const response: StatusResponse = {
      whatsapp: whatsappStatus,
      discord: discordStatus,
      logs: allLogs,
    };

    apiLogger.response('GET', '/api/bots/status', 200, timer());

    return NextResponse.json(response);
  } catch (error) {
    botLogger.error('Error checking bot status', error);
    apiLogger.response('GET', '/api/bots/status', 500, timer());

    return NextResponse.json(
      {
        error: 'Failed to check bot status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
