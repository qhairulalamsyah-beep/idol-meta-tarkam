import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import pusher, { globalChannel, tournamentChannel } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

/**
 * Snake draft assignment for balanced teams:
 * Rank 1-4: Alpha, Beta, Gamma, Delta
 * Rank 5-8: Delta, Gamma, Beta, Alpha (reversed)
 * Rank 9-12: Alpha, Beta, Gamma, Delta
 */
function assignTeamsBySnakeDraft(userIdOrdered: string[]): Map<string, number> {
  const assignment = new Map<string, number>();
  const total = userIdOrdered.length;
  const teamCount = 4;

  for (let i = 0; i < total; i++) {
    const round = Math.floor(i / teamCount);
    const pos = i % teamCount;
    // Even rounds: 0,1,2,3; Odd rounds: 3,2,1,0
    const teamIndex = round % 2 === 0 ? pos : (teamCount - 1 - pos);
    assignment.set(userIdOrdered[i], teamIndex);
  }

  return assignment;
}

/**
 * Generate team name based on Tier S player with highest rank (lowest index)
 * If no Tier S player, use the captain (first player in the team)
 */
function generateTeamName(
  teamPlayers: { id: string; name: string; points: number; tier: string; rank: number }[]
): string {
  // Find all Tier S players in the team
  const tierSPlayers = teamPlayers.filter(p => p.tier === 'S');
  
  if (tierSPlayers.length > 0) {
    // Sort by rank (lower rank = higher position) and pick the first one
    tierSPlayers.sort((a, b) => a.rank - b.rank);
    return `Tim ${tierSPlayers[0].name}`;
  }
  
  // No Tier S player, use captain (first player by rank)
  teamPlayers.sort((a, b) => a.rank - b.rank);
  return `Tim ${teamPlayers[0].name}`;
}

// GET - Fetch Grand Final tournament status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division') || 'male';

    // Find the latest grand_final tournament for this division
    const gfTournament = await db.tournament.findFirst({
      where: {
        type: 'grand_final',
        division,
      },
      include: {
        teams: {
          include: {
            members: {
              include: { user: true },
              orderBy: { role: 'desc' },
            },
          },
          orderBy: { seed: 'asc' },
        },
        matches: {
          include: {
            teamA: {
              include: { members: { include: { user: true } } },
            },
            teamB: {
              include: { members: { include: { user: true } } },
            },
            winner: true,
            mvp: true,
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get top 12 qualified players for preview
    const qualifiedPlayers = await db.user.findMany({
      where: {
        gender: division,
        role: { in: ['user', 'admin'] },
        isAdmin: false,
      },
      orderBy: { points: 'desc' },
      take: 12,
      select: { id: true, name: true, points: true, tier: true, avatar: true, email: true, gender: true },
    });

    return NextResponse.json({
      success: true,
      grandFinal: gfTournament,
      qualifiedPlayers,
      teamCount: 4,
    });
  } catch (error) {
    console.error('Error fetching grand final:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch grand final' },
      { status: 500 }
    );
  }
}

// POST - Setup Grand Final (admin only)
// Takes top 12 players, creates 4 teams of 3, generates 4-team bracket
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { division = 'male', prizePool = 0, mode, bpm, lokasi } = body;

    // 1. Get top 12 players by points for this division
    const players = await db.user.findMany({
      where: {
        gender: division,
        role: { in: ['user', 'admin'] },
        isAdmin: false,
      },
      orderBy: { points: 'desc' },
      take: 12,
      select: { id: true, name: true, points: true, tier: true },
    });

    if (players.length < 12) {
      return NextResponse.json(
        { success: false, error: `Butuh 12 pemain. Saat ini hanya ${players.length} pemain tersedia.` },
        { status: 400 }
      );
    }

    // 2. Check if there's already an active grand final
    const existingGF = await db.tournament.findFirst({
      where: {
        type: 'grand_final',
        division,
        status: { in: ['setup', 'registration', 'ongoing'] },
      },
    });

    if (existingGF) {
      return NextResponse.json(
        { success: false, error: 'Grand Final sudah ada dan sedang berjalan.' },
        { status: 400 }
      );
    }

    // 3. Assign teams using snake draft
    const userIds = players.map(p => p.id);
    const teamAssignment = assignTeamsBySnakeDraft(userIds);

    // Group players by assigned team with their rank (index in sorted list)
    const teamPlayers: Map<number, Array<{ id: string; name: string; points: number; tier: string; rank: number }>> = new Map();
    for (let i = 0; i < 4; i++) teamPlayers.set(i, []);

    for (let i = 0; i < players.length; i++) {
      const teamIdx = teamAssignment.get(players[i].id)!;
      teamPlayers.get(teamIdx)!.push({
        ...players[i],
        rank: i + 1, // rank is 1-based (1 = highest points)
      });
    }

    // Generate team names based on Tier S players
    const teamNames: string[] = [];
    for (let t = 0; t < 4; t++) {
      const name = generateTeamName(teamPlayers.get(t)!);
      teamNames.push(name);
    }

    // 4. Create tournament
    const tournamentId = uuidv4();
    await db.tournament.create({
      data: {
        id: tournamentId,
        name: `GRAND FINAL - ${division === 'male' ? 'Putra' : 'Putri'}`,
        division,
        type: 'grand_final',
        status: 'ongoing',
        bracketType: 'single',
        prizePool: prizePool || 0,
        mode: mode || 'GR Arena 3vs3',
        bpm: bpm || '130',
        lokasi: lokasi || 'PUB 1',
      },
    });

    // 5. Create 4 teams with members
    const teamIds: string[] = [];

    for (let t = 0; t < 4; t++) {
      const teamId = uuidv4();
      teamIds.push(teamId);
      const tp = teamPlayers.get(t)!;

      await db.team.create({
        data: {
          id: teamId,
          tournamentId,
          name: teamNames[t],
          seed: t + 1,
        },
      });

      // Create team members (first player by rank = captain)
      const sortedPlayers = [...tp].sort((a, b) => a.rank - b.rank);
      for (let m = 0; m < sortedPlayers.length; m++) {
        await db.teamMember.create({
          data: {
            teamId,
            userId: sortedPlayers[m].id,
            role: m === 0 ? 'captain' : 'member',
          },
        });
      }
    }

    // 6. Generate 4-team single elimination bracket
    // Semi 1: Team seed 1 vs Team seed 4
    // Semi 2: Team seed 2 vs Team seed 3
    // Final: Winner SF1 vs Winner SF2
    const matches = [
      // Round 1 — Semifinals
      {
        id: uuidv4(),
        tournamentId,
        round: 1,
        matchNumber: 1,
        teamAId: teamIds[0], // Seed 1
        teamBId: teamIds[3], // Seed 4
        status: 'pending',
        bracket: 'winners',
      },
      {
        id: uuidv4(),
        tournamentId,
        round: 1,
        matchNumber: 2,
        teamAId: teamIds[1], // Seed 2
        teamBId: teamIds[2], // Seed 3
        status: 'pending',
        bracket: 'winners',
      },
      // Round 2 — Final
      {
        id: uuidv4(),
        tournamentId,
        round: 2,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        status: 'pending',
        bracket: 'winners',
      },
    ];

    await db.match.createMany({ data: matches });

    // 7. Fire Pusher events
    pusher.trigger(
      [globalChannel, tournamentChannel(tournamentId)],
      'tournament-update',
      { action: 'grand-final-setup', tournamentId, division }
    ).catch(() => {});

    pusher.trigger(
      globalChannel,
      'announcement',
      { message: `GRAND FINAL ${division === 'male' ? 'PUTRA' : 'PUTRI'} dimulai! 4 tim siap bertanding!`, type: 'success' }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      tournamentId,
      teams: teamNames,
      players: players.map((p, i) => ({ id: p.id, name: p.name, points: p.points, tier: p.tier, rank: i + 1 })),
    });
  } catch (error) {
    console.error('Error setting up grand final:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup grand final' },
      { status: 500 }
    );
  }
}

// DELETE - Reset Grand Final tournament (admin only)
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'tournamentId is required' },
        { status: 400 }
      );
    }

    const existing = await db.tournament.findUnique({ where: { id: tournamentId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    await db.playerMatchStat.deleteMany({ where: { match: { tournamentId } } });
    await db.match.deleteMany({ where: { tournamentId } });
    await db.teamMember.deleteMany({ where: { team: { tournamentId } } });
    await db.team.deleteMany({ where: { tournamentId } });
    await db.registration.deleteMany({ where: { tournamentId } });
    await db.tournament.delete({ where: { id: tournamentId } });

    pusher.trigger(
      globalChannel,
      'tournament-update',
      { action: 'grand-final-deleted', tournamentId, division: existing.division }
    ).catch(() => {});

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Error deleting grand final:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete grand final' },
      { status: 500 }
    );
  }
}
