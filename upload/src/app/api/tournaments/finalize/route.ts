import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import pusher, { globalChannel, tournamentChannel } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

// POST - Finalize tournament (admin only)
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { tournamentId } = body;

    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        matches: {
          where: { bracket: 'winners' },
          include: {
            teamA: { include: { members: true } },
            teamB: { include: { members: true } },
            winner: { include: { members: true } },
            mvp: true,
          },
          orderBy: { round: 'desc' },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Find champion (winner of final match)
    const finalMatch = tournament.matches[0];
    if (!finalMatch || !finalMatch.winnerId) {
      return NextResponse.json(
        { success: false, error: 'Final match not completed' },
        { status: 400 }
      );
    }

    const champion = finalMatch.winner;
    const runnerUp = finalMatch.winnerId === finalMatch.teamAId ? finalMatch.teamB : finalMatch.teamA;

    // Find third place (simplified - winner of previous round's losing match)
    const previousRoundMatches = tournament.matches.filter(m => m.round === finalMatch.round - 1);
    let thirdPlace = null;
    if (previousRoundMatches.length > 0) {
      for (const match of previousRoundMatches) {
        const loser = match.winnerId === match.teamAId ? match.teamB : match.teamA;
        if (loser && loser.id !== champion.id && (!runnerUp || loser.id !== runnerUp.id)) {
          thirdPlace = loser;
          break;
        }
      }
    }

    // Point system
    const pointSystem = {
      champion: 100,
      runnerUp: 70,
      third: 50,
      mvp: 30,
      participation: 10,
    };

    // Collect all unique user IDs who receive special points
    const awardedUserIds = new Set<string>();
    const results: Array<{ userId: string; points: number; role: string }> = [];

    // Build user → total points map (merge multiple roles)
    const userPointsMap = new Map<string, { points: number; wins: number; roles: string[] }>();

    const addPoints = (userId: string, pts: number, role: string, addWin: boolean) => {
      awardedUserIds.add(userId);
      const existing = userPointsMap.get(userId) || { points: 0, wins: 0, roles: [] };
      existing.points += pts;
      if (addWin) existing.wins += 1;
      existing.roles.push(role);
      userPointsMap.set(userId, existing);
    };

    // Champion members
    if (champion) {
      for (const member of champion.members) {
        addPoints(member.userId, pointSystem.champion, 'champion', true);
      }
    }

    // Runner-up members
    if (runnerUp) {
      for (const member of runnerUp.members) {
        addPoints(member.userId, pointSystem.runnerUp, 'runner-up', false);
      }
    }

    // Third place members
    if (thirdPlace) {
      for (const member of thirdPlace.members) {
        addPoints(member.userId, pointSystem.third, 'third', false);
      }
    }

    // MVP
    if (finalMatch.mvpId) {
      addPoints(finalMatch.mvpId, pointSystem.mvp, 'mvp', false);
    }

    // Get ALL matches for participation points
    const allMatches = await db.match.findMany({
      where: { tournamentId },
      include: {
        teamA: { include: { members: true } },
        teamB: { include: { members: true } },
      },
    });

    // Award participation to all unique participants not already awarded
    for (const match of allMatches) {
      if (match.teamA) {
        for (const member of match.teamA.members) {
          if (!awardedUserIds.has(member.userId)) {
            addPoints(member.userId, pointSystem.participation, 'participant', false);
          }
        }
      }
      if (match.teamB) {
        for (const member of match.teamB.members) {
          if (!awardedUserIds.has(member.userId)) {
            addPoints(member.userId, pointSystem.participation, 'participant', false);
          }
        }
      }
    }

    // Build results array
    for (const [userId, data] of userPointsMap) {
      for (const role of data.roles) {
        const pts = role === 'champion' ? pointSystem.champion
          : role === 'runner-up' ? pointSystem.runnerUp
          : role === 'third' ? pointSystem.third
          : role === 'mvp' ? pointSystem.mvp
          : pointSystem.participation;
        results.push({ userId, points: pts, role });
      }
    }

    // Execute all point updates in a single atomic transaction
    // Using increment to avoid race conditions (no read-modify-write)
    const userUpdateOps = Array.from(userPointsMap.entries()).map(([userId, data]) =>
      db.user.update({
        where: { id: userId },
        data: { points: { increment: data.points } },
      })
    );

    const rankingUpdateOps = Array.from(userPointsMap.entries()).map(([userId, data]) =>
      db.ranking.update({
        where: { userId },
        data: {
          points: { increment: data.points },
          ...(data.wins > 0 ? { wins: { increment: data.wins } } : {}),
        },
      })
    );

    const mvpUpdateOp = finalMatch.mvpId
      ? [db.user.update({ where: { id: finalMatch.mvpId }, data: { isMVP: true } })]
      : [];

    await db.$transaction([
      ...userUpdateOps,
      ...rankingUpdateOps,
      ...mvpUpdateOp,
      db.tournament.update({
        where: { id: tournamentId },
        data: { status: 'completed' },
      }),
    ]);

    pusher.trigger([globalChannel, tournamentChannel(tournamentId)], 'tournament-update', { action: 'finalized', tournamentId, division: tournament.division }).catch(() => {});
    pusher.trigger([globalChannel, tournamentChannel(tournamentId)], 'announcement', { message: 'Tournament completed!', type: 'success', tournamentId }).catch(() => {});

    return NextResponse.json({
      success: true,
      champion: champion ? { id: champion.id, name: champion.name } : null,
      runnerUp: runnerUp ? { id: runnerUp.id, name: runnerUp.name } : null,
      thirdPlace: thirdPlace ? { id: thirdPlace.id, name: thirdPlace.name } : null,
      mvp: finalMatch.mvp ? { id: finalMatch.mvp.id, name: finalMatch.mvp.name } : null,
      results,
    });
  } catch (error) {
    console.error('Error finalizing tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to finalize tournament' },
      { status: 500 }
    );
  }
}
