import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import pusher, { globalChannel } from '@/lib/pusher';

// POST - Full database reset (super_admin only, keeps Characters & super_admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requesterId, confirmPhrase } = body;

    if (!requesterId) {
      return NextResponse.json({ success: false, error: 'Auth required' }, { status: 401 });
    }

    // Verify super_admin
    const requester = await db.user.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak — hanya super admin' }, { status: 403 });
    }

    // Require confirmation phrase to prevent accidental reset
    if (confirmPhrase !== 'RESET SEMUA DATA') {
      return NextResponse.json({
        success: false,
        error: 'Ketik "RESET SEMUA DATA" untuk konfirmasi',
      }, { status: 400 });
    }

    console.log('[Full Reset] Starting database reset by super_admin:', requester.name);

    // Delete all data in correct dependency order using sequential operations
    // (sequential is safer than transaction for complex cascading deletes)
    const results: string[] = [];

    try { const n = await db.playerMatchStat.deleteMany({}); results.push(`playerMatchStat: ${n.count}`); } catch (e: unknown) { results.push(`playerMatchStat: SKIP`); console.warn('[Reset] playerMatchStat:', (e as Error).message); }
    try { const n = await db.botLog.deleteMany({}); results.push(`botLog: ${n.count}`); } catch (e: unknown) { results.push(`botLog: SKIP`); console.warn('[Reset] botLog:', (e as Error).message); }
    try { const n = await db.match.deleteMany({}); results.push(`match: ${n.count}`); } catch (e: unknown) { results.push(`match: SKIP`); console.warn('[Reset] match:', (e as Error).message); }
    try { const n = await db.teamMember.deleteMany({}); results.push(`teamMember: ${n.count}`); } catch (e: unknown) { results.push(`teamMember: SKIP`); console.warn('[Reset] teamMember:', (e as Error).message); }
    try { const n = await db.team.deleteMany({}); results.push(`team: ${n.count}`); } catch (e: unknown) { results.push(`team: SKIP`); console.warn('[Reset] team:', (e as Error).message); }
    try { const n = await db.ranking.deleteMany({}); results.push(`ranking: ${n.count}`); } catch (e: unknown) { results.push(`ranking: SKIP`); console.warn('[Reset] ranking:', (e as Error).message); }
    try { const n = await db.registration.deleteMany({}); results.push(`registration: ${n.count}`); } catch (e: unknown) { results.push(`registration: SKIP`); console.warn('[Reset] registration:', (e as Error).message); }
    try { const n = await db.donation.deleteMany({}); results.push(`donation: ${n.count}`); } catch (e: unknown) { results.push(`donation: SKIP`); console.warn('[Reset] donation:', (e as Error).message); }
    try { const n = await db.sawer.deleteMany({}); results.push(`sawer: ${n.count}`); } catch (e: unknown) { results.push(`sawer: SKIP`); console.warn('[Reset] sawer:', (e as Error).message); }
    try { const n = await db.activityLog.deleteMany({}); results.push(`activityLog: ${n.count}`); } catch (e: unknown) { results.push(`activityLog: SKIP`); console.warn('[Reset] activityLog:', (e as Error).message); }
    try { const n = await db.character.updateMany({ where: { isTaken: true }, data: { isTaken: false, takenBy: null, takenAt: null } }); results.push(`character reset: ${n.count}`); } catch (e: unknown) { results.push(`character: SKIP`); console.warn('[Reset] character:', (e as Error).message); }
    // Delete all non-admin users
    try { const n = await db.user.deleteMany({ where: { role: { not: 'super_admin' } } }); results.push(`user (non-admin): ${n.count}`); } catch (e: unknown) { results.push(`user: SKIP`); console.warn('[Reset] user:', (e as Error).message); }
    // Reset super_admin player data so they don't appear in leaderboard/MVP
    try { const n = await db.user.updateMany({ where: { role: 'super_admin' }, data: { points: 0, tier: 'B', isMVP: false, mvpScore: 0 } }); results.push(`super_admin reset: ${n.count}`); } catch (e: unknown) { results.push(`super_admin reset: SKIP`); console.warn('[Reset] super_admin reset:', (e as Error).message); }
    // Delete super_admin rankings so they don't appear in leaderboard
    try { const admins = await db.user.findMany({ where: { role: 'super_admin' }, select: { id: true } }); if (admins.length > 0) { const ids = admins.map(a => a.id); const n = await db.ranking.deleteMany({ where: { userId: { in: ids } } }); results.push(`super_admin ranking removed: ${n.count}`); } else { results.push(`super_admin ranking: none`); } } catch (e: unknown) { results.push(`super_admin ranking: SKIP`); console.warn('[Reset] super_admin ranking:', (e as Error).message); }
    try { const n = await db.tournament.deleteMany({}); results.push(`tournament: ${n.count}`); } catch (e: unknown) { results.push(`tournament: SKIP`); console.warn('[Reset] tournament:', (e as Error).message); }

    console.log('[Full Reset] Results:', results.join(', '));

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          action: 'FULL_RESET',
          details: `Super admin "${requester.name}" performed full database reset. Deleted: ${results.join(', ')}`,
          userId: requesterId,
        },
      });
    } catch {}

    // Pusher broadcast
    pusher.trigger([globalChannel], 'announcement', {
      message: '🔄 Database direset menyeluruh oleh Super Admin. Semua data turnamen, pemain, dan donasi telah dihapus.',
      type: 'warning',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Database berhasil direset. Semua data turnamen, pemain, dan donasi telah dihapus. Karakter DC/Marvel dipertahankan.',
      details: results,
    });
  } catch (error) {
    console.error('[Full Reset] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: `Gagal mereset database: ${msg}` }, { status: 500 });
  }
}
