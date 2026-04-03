import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import pusher, { globalChannel, tournamentChannel } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

// POST - Reset tournament data (admin only)
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { tournamentId } = body;

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'tournamentId is required' },
        { status: 400 }
      );
    }

    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Turnamen tidak ditemukan' },
        { status: 404 }
      );
    }

    // Find team IDs for cascade deletion
    const teams = await db.team.findMany({
      where: { tournamentId },
      select: { id: true },
    });
    const teamIds = teams.map((t) => t.id);

    // Calculate next week number — reset to 1 after Grand Final (week 8)
    const currentWeek = tournament.week || 1;
    const nextWeek = currentWeek >= 8 ? 1 : currentWeek + 1;
    const isGrandFinal = currentWeek >= 8;
    const seasonName = isGrandFinal ? 'Musim Baru' : `Minggu ${nextWeek}`;

    // Execute deletions atomically in a single transaction
    await db.$transaction([
      // 1. Delete all matches for this tournament
      db.match.deleteMany({ where: { tournamentId } }),
      // 2. Delete all team members for these teams
      ...(teamIds.length > 0
        ? [db.teamMember.deleteMany({ where: { teamId: { in: teamIds } } })]
        : []),
      // 3. Delete all teams for this tournament
      db.team.deleteMany({ where: { tournamentId } }),
      // 4. Delete sawer for this tournament only
      db.sawer.deleteMany({ where: { tournamentId } }),
      // 5. Reset registrations back to "pending" for re-approval next week
      db.registration.updateMany({
        where: { tournamentId },
        data: { status: 'pending', tierAssigned: null },
      }),
      // 6. Reset the tournament — advance week (or reset to 1 after Grand Final), keep prizePool
      db.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'registration',
          week: nextWeek,
          bracketType: null,
          prizePool: 0,
          startDate: null,
          endDate: null,
          name: isGrandFinal
            ? 'IDOL META - Musim Baru'
            : `IDOL META - Week ${nextWeek}`,
        },
      }),
    ]);

    // Pusher broadcast
    pusher.trigger([globalChannel, tournamentChannel(tournamentId)], 'tournament-update', {
      action: 'reset',
      tournamentId,
      division: tournament.division,
      week: nextWeek,
    }).catch(() => {});

    pusher.trigger([globalChannel, tournamentChannel(tournamentId)], 'announcement', {
      message: isGrandFinal
        ? `Grand Final selesai! Memulai musim baru dari Minggu 1. Point & statistik pemain tetap tersimpan.`
        : `Data pertandingan direset! Memulai Minggu ${nextWeek}. Point & statistik pemain tetap tersimpan.`,
      type: isGrandFinal ? 'success' : 'info',
      tournamentId,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: isGrandFinal
        ? 'Grand Final selesai! Memulai musim baru dari Minggu 1.'
        : `Data direset! Memulai Minggu ${nextWeek}. Point pemain tetap tersimpan.`,
      tournamentId,
      nextWeek,
      isGrandFinal,
    });
  } catch (error) {
    console.error('Error resetting tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mereset data turnamen' },
      { status: 500 }
    );
  }
}
