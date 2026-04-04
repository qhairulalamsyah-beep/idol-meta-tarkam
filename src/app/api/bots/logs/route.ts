import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface BotLogEntry {
  id: string;
  platform: string;
  command: string;
  sender: string | null;
  senderId: string | null;
  response: string | null;
  success: boolean;
  tournamentId: string | null;
  createdAt: Date;
}

interface LogsResponse {
  success: boolean;
  logs: BotLogEntry[];
  pagination: {
    platform: string;
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_OFFSET = 0;
const VALID_PLATFORMS = ['whatsapp', 'discord', 'all'];

// ═══════════════════════════════════════════════════════════════════════════
// Route Handler
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/bots/logs
 *
 * Retrieves paginated bot activity logs from the BotLog table.
 *
 * Query params:
 *   platform?: 'whatsapp' | 'discord' | 'all' (default: 'all')
 *   limit?:   number  (default: 50, max: 200)
 *   offset?:  number  (default: 0)
 *
 * Response: {
 *   success: true,
 *   logs: BotLogEntry[],
 *   pagination: { platform, total, limit, offset, hasMore }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate platform filter
    const rawPlatform = searchParams.get('platform') || 'all';
    const platform = rawPlatform.toLowerCase();
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        {
          success: false,
          logs: [],
          pagination: {
            platform,
            total: 0,
            limit: 0,
            offset: 0,
            hasMore: false,
          },
          error: `Invalid platform "${platform}". Use: whatsapp, discord, or all`,
        },
        { status: 400 }
      );
    }

    // Parse and validate limit
    const rawLimit = searchParams.get('limit');
    let limit = DEFAULT_LIMIT;
    if (rawLimit) {
      const parsed = parseInt(rawLimit, 10);
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json(
          {
            success: false,
            logs: [],
            pagination: {
              platform,
              total: 0,
              limit: 0,
              offset: 0,
              hasMore: false,
            },
            error: 'Invalid "limit" parameter. Must be a positive integer.',
          },
          { status: 400 }
        );
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    // Parse and validate offset
    const rawOffset = searchParams.get('offset');
    let offset = DEFAULT_OFFSET;
    if (rawOffset) {
      const parsed = parseInt(rawOffset, 10);
      if (isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          {
            success: false,
            logs: [],
            pagination: {
              platform,
              total: 0,
              limit: 0,
              offset: 0,
              hasMore: false,
            },
            error: 'Invalid "offset" parameter. Must be a non-negative integer.',
          },
          { status: 400 }
        );
      }
      offset = parsed;
    }

    // Build where clause for platform filter
    const whereClause =
      platform === 'all' ? {} : { platform };

    // Count total matching logs
    const total = await db.botLog.count({
      where: whereClause,
    });

    // Fetch paginated logs
    const logs = await db.botLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        platform: true,
        command: true,
        sender: true,
        senderId: true,
        response: true,
        success: true,
        tournamentId: true,
        createdAt: true,
      },
    });

    const hasMore = offset + limit < total;

    const response: LogsResponse = {
      success: true,
      logs,
      pagination: {
        platform,
        total,
        limit,
        offset,
        hasMore,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Bot Logs] Error fetching bot logs:', error);

    return NextResponse.json(
      {
        success: false,
        logs: [],
        pagination: {
          platform: 'all',
          total: 0,
          limit: 0,
          offset: 0,
          hasMore: false,
        },
        error: 'Failed to fetch bot logs.',
      },
      { status: 500 }
    );
  }
}
