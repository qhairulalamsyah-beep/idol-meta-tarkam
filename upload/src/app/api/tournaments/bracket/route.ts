import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import pusher, { globalChannel, tournamentChannel } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

type MatchData = {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  status: string;
  bracket: string;
};

// POST - Generate tournament bracket (admin only)
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { tournamentId, bracketType } = body;

    // Get teams
    const teams = await db.team.findMany({
      where: { tournamentId },
      include: {
        members: {
          include: { user: true },
        },
      },
      orderBy: { seed: 'asc' },
    });

    if (teams.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Need at least 2 teams to generate bracket' },
        { status: 400 }
      );
    }

    const numTeams = teams.length;
    const rounds = Math.ceil(Math.log2(numTeams));
    const bracketSize = Math.pow(2, rounds);

    // Pad teams with nulls if not a power of 2 (gives byes)
    const paddedTeams: (typeof teams[number] | null)[] = [...teams];
    while (paddedTeams.length < bracketSize) {
      paddedTeams.push(null);
    }

    // Build all match data upfront (no DB calls yet)
    const allMatchData: MatchData[] = [];

    if (bracketType === 'single') {
      for (let round = 1; round <= rounds; round++) {
        const matchesInRound = bracketSize / Math.pow(2, round);
        for (let i = 0; i < matchesInRound; i++) {
          const teamA = round === 1 ? paddedTeams[i * 2] : null;
          const teamB = round === 1 ? paddedTeams[i * 2 + 1] : null;
          allMatchData.push({
            id: uuidv4(),
            tournamentId,
            round,
            matchNumber: i + 1,
            teamAId: teamA?.id || null,
            teamBId: teamB?.id || null,
            status: 'pending',
            bracket: 'winners',
          });
        }
      }

    } else if (bracketType === 'double') {
      // Winners Bracket
      for (let r = 1; r <= rounds; r++) {
        const matchesInRound = bracketSize / Math.pow(2, r);
        for (let i = 0; i < matchesInRound; i++) {
          const teamA = r === 1 ? paddedTeams[i * 2] : null;
          const teamB = r === 1 ? paddedTeams[i * 2 + 1] : null;
          allMatchData.push({
            id: uuidv4(),
            tournamentId,
            round: r,
            matchNumber: i + 1,
            teamAId: teamA?.id || null,
            teamBId: teamB?.id || null,
            status: 'pending',
            bracket: 'winners',
          });
        }
      }

      // Losers Bracket
      const lbRounds = 2 * rounds - 2;
      for (let l = 1; l <= lbRounds; l++) {
        const k = Math.floor((l + 1) / 2);
        const matchesInRound = bracketSize / Math.pow(2, k + 1);
        for (let i = 0; i < matchesInRound; i++) {
          allMatchData.push({
            id: uuidv4(),
            tournamentId,
            round: l,
            matchNumber: i + 1,
            teamAId: null,
            teamBId: null,
            status: 'pending',
            bracket: 'losers',
          });
        }
      }

      // Grand Final
      allMatchData.push({
        id: uuidv4(),
        tournamentId,
        round: 1,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        status: 'pending',
        bracket: 'grand_final',
      });

    } else if (bracketType === 'group') {
      const groupSize = 4;
      const numGroups = Math.ceil(numTeams / groupSize);
      let matchNumber = 1;

      // Group stage matches (round-robin)
      for (let group = 0; group < numGroups; group++) {
        const groupTeams = teams.slice(group * groupSize, (group + 1) * groupSize);
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            allMatchData.push({
              id: uuidv4(),
              tournamentId,
              round: group + 1,
              matchNumber: matchNumber++,
              teamAId: groupTeams[i].id,
              teamBId: groupTeams[j].id,
              status: 'pending',
              bracket: 'group',
            });
          }
        }
      }

      // Playoff bracket
      const playoffTeams = numGroups * 2;
      const playoffRounds = Math.ceil(Math.log2(playoffTeams));
      for (let round = 1; round <= playoffRounds; round++) {
        const matchesInRound = playoffTeams / Math.pow(2, round);
        for (let i = 0; i < matchesInRound; i++) {
          allMatchData.push({
            id: uuidv4(),
            tournamentId,
            round: round + numGroups,
            matchNumber: i + 1,
            teamAId: null,
            teamBId: null,
            status: 'pending',
            bracket: 'playoff',
          });
        }
      }
    }

    // Execute: delete old matches, create all new matches, update tournament — all in one transaction
    await db.$transaction([
      db.match.deleteMany({ where: { tournamentId } }),
      db.match.createMany({ data: allMatchData }),
      db.tournament.update({
        where: { id: tournamentId },
        data: { status: 'ongoing', bracketType },
      }),
    ]);

    // Fire Pusher event
    pusher.trigger(
      [globalChannel, tournamentChannel(tournamentId)],
      'tournament-update',
      { action: 'bracket-generated', tournamentId }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      bracketType,
      totalMatches: allMatchData.length,
      matches: allMatchData,
    });
  } catch (error) {
    console.error('Error generating bracket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate bracket' },
      { status: 500 }
    );
  }
}
