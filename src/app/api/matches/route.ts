import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerMatchScore, triggerMatchResult } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

// ──────────────────────────────────────────────────────────────────
// Point Configuration
// ──────────────────────────────────────────────────────────────────
const POINTS_CONFIG = {
  win: 100,           // Points for each winning team member
  mvpBonus: 25,       // Additional points for MVP
  loss: 25,           // Points for each losing team member
};

// GET - Get matches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');
    const matchId = searchParams.get('matchId');
    const status = searchParams.get('status');

    if (matchId) {
      const match = await db.match.findUnique({
        where: { id: matchId },
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
      });
      return NextResponse.json({ success: true, match });
    }

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'Tournament ID required' },
        { status: 400 }
      );
    }

    const where: Record<string, string | Record<string, string>> = { tournamentId };
    if (status) where.status = status;

    const matches = await db.match.findMany({
      where,
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
    });

    return NextResponse.json({ success: true, matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}

// PUT - Update match score & handle advancement (admin only)
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { matchId, scoreA, scoreB, mvpId, status } = body;

    // Fetch match with basic team info
    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // Determine winner from scores
    let winnerId: string | null = null;
    let autoComplete = false;
    if (scoreA !== undefined && scoreB !== undefined) {
      if (scoreA > scoreB) winnerId = match.teamAId;
      else if (scoreB > scoreA) winnerId = match.teamBId;
      // Auto-complete when scores differ and match was pending/ongoing
      if (winnerId && match.status !== 'completed') {
        autoComplete = true;
      }
    }

    // Build update data
    const updateData: Record<string, string | number | null | Date> = {};
    if (scoreA !== undefined) updateData.scoreA = scoreA;
    if (scoreB !== undefined) updateData.scoreB = scoreB;
    if (winnerId) updateData.winnerId = winnerId;
    if (mvpId) updateData.mvpId = mvpId;
    if (status) {
      updateData.status = status;
      if (status === 'completed') updateData.completedAt = new Date();
    } else if (autoComplete) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }

    // Update the match in DB
    const updatedMatch = await db.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        teamA: { include: { members: { include: { user: true } } } },
        teamB: { include: { members: { include: { user: true } } } },
        winner: true,
        mvp: true,
      },
    });

    // ─── Handle match completion: award points + advancement ───
    if ((status === 'completed' || autoComplete) && winnerId) {
      // Award points to team members
      await awardMatchPoints(match, winnerId, mvpId || null);
      // Get tournament bracket type to determine advancement strategy
      const tournament = await db.tournament.findUnique({
        where: { id: match.tournamentId },
        select: { bracketType: true },
      });

      const bracketType = tournament?.bracketType || 'single';

      if (bracketType === 'double') {
        await handleDoubleEliminationAdvancement(
          match.tournamentId,
          match.bracket as string,
          match.round,
          match.matchNumber,
          winnerId,
          match.teamAId,
          match.teamBId
        );
      } else {
        // Single elimination, group, or playoff — simple winner advance
        if (match.bracket === 'winners' || match.bracket === 'playoff') {
          await advanceWinnerInBracket(
            match.tournamentId,
            match.bracket as string,
            match.round,
            match.matchNumber,
            winnerId
          );
        }
        // Group bracket: check if all group matches done → transition to playoff
        if (match.bracket === 'group' && bracketType === 'group') {
          await checkAndTransitionToPlayoff(match.tournamentId);
        }
      }
    }

    // Fire Pusher triggers (fire-and-forget)
    if (scoreA !== undefined && scoreB !== undefined) {
      triggerMatchScore(updatedMatch.tournamentId, {
        matchId, scoreA, scoreB, tournamentId: updatedMatch.tournamentId,
      }).catch(() => {});
    }
    if (status === 'completed' && winnerId) {
      triggerMatchResult(updatedMatch.tournamentId, {
        matchId, winnerId, tournamentId: updatedMatch.tournamentId,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update match' },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────────────
// Simple winner advancement (single elimination / playoff)
// ──────────────────────────────────────────────────────────────────

async function advanceWinnerInBracket(
  tournamentId: string,
  bracket: string,
  currentRound: number,
  matchNumber: number,
  winnerId: string,
) {
  const matches = await db.match.findMany({
    where: { tournamentId, bracket },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const nextRound = currentRound + 1;
  const nextMatchNumber = Math.ceil(matchNumber / 2);
  const isFirstTeam = matchNumber % 2 === 1;

  const nextMatch = matches.find(
    (m) => m.round === nextRound && m.matchNumber === nextMatchNumber
  );

  if (nextMatch) {
    // Don't overwrite an already-placed team
    if (isFirstTeam && !nextMatch.teamAId) {
      await db.match.update({ where: { id: nextMatch.id }, data: { teamAId: winnerId } });
    } else if (!isFirstTeam && !nextMatch.teamBId) {
      await db.match.update({ where: { id: nextMatch.id }, data: { teamBId: winnerId } });
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// Double elimination advancement
// ──────────────────────────────────────────────────────────────────

interface DBMatch {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  bracket: string;
}

async function handleDoubleEliminationAdvancement(
  tournamentId: string,
  matchBracket: string,
  matchRound: number,
  matchNumber: number,
  winnerId: string,
  teamAId: string | null,
  teamBId: string | null,
) {
  // Fetch all matches for this tournament grouped by bracket
  const allMatches = await db.match.findMany({
    where: { tournamentId },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const wrMatches = allMatches.filter((m) => m.bracket === 'winners');
  const lbMatches = allMatches.filter((m) => m.bracket === 'losers');
  const gfMatches = allMatches.filter((m) => m.bracket === 'grand_final');

  const wrMaxRound = Math.max(...wrMatches.map((m) => m.round), 0);
  const lbMaxRound = Math.max(...lbMatches.map((m) => m.round), 0);

  if (matchBracket === 'winners') {
    // ─── 1. Advance winner within winners bracket ─────────────
    await placeTeamInMatch(wrMatches, matchRound + 1, Math.ceil(matchNumber / 2), winnerId, matchNumber % 2 === 1 ? 'A' : 'B');

    // ─── 2. Drop loser to losers bracket ─────────────────────
    const loserId = teamAId === winnerId ? teamBId : teamAId;
    if (loserId) {
      const dropTarget = getLosersDropTarget(matchRound, matchNumber);
      if (dropTarget) {
        await placeTeamInMatch(lbMatches, dropTarget.round, dropTarget.match, loserId, dropTarget.slot);
      }
    }

    // ─── 3. If WR Final completed → advance WB champion to GF ──
    if (matchRound === wrMaxRound && gfMatches.length > 0) {
      await db.match.update({
        where: { id: gfMatches[0].id },
        data: { teamAId: winnerId },
      });
    }

  } else if (matchBracket === 'losers') {
    // ─── 1. If LB Final → advance to Grand Final team B ──────
    if (matchRound === lbMaxRound && gfMatches.length > 0) {
      await db.match.update({
        where: { id: gfMatches[0].id },
        data: { teamBId: winnerId },
      });
    } else {
      // ─── 2. Advance winner within losers bracket ────────────
      const lbTarget = getLosersBracketAdvanceTarget(matchRound, matchNumber);
      if (lbTarget) {
        await placeTeamInMatch(lbMatches, lbTarget.round, lbTarget.match, winnerId, lbTarget.slot);
      }
    }

  } else if (matchBracket === 'grand_final') {
    // Grand Final completed — champion determined, no further advancement
    console.log(`[Bracket] Grand Final completed! Champion team: ${winnerId}`);
  }
}

/**
 * Get where a WR loser should be placed in the losers bracket.
 *
 * WR Round 1 losers → LR Round 1, paired: M1L+M2L→LR1M1, M3L+M4L→LR1M2
 * WR Round r>1 losers → LR Round (2r-2), same match number, team B slot
 */
function getLosersDropTarget(
  wrRound: number,
  wrMatchNumber: number,
): { round: number; match: number; slot: 'A' | 'B' } | null {
  if (wrRound === 1) {
    return {
      round: 1,
      match: Math.ceil(wrMatchNumber / 2),
      slot: wrMatchNumber % 2 === 1 ? 'A' : 'B',
    };
  } else {
    return {
      round: 2 * wrRound - 2,
      match: wrMatchNumber,
      slot: 'B',
    };
  }
}

/**
 * Get where a LB winner should advance within the losers bracket.
 *
 * LR odd round (elimination → feed): same match number, team A
 * LR even round (feed → elimination): halved match number, slot depends on odd/even
 */
function getLosersBracketAdvanceTarget(
  currentRound: number,
  matchNumber: number,
): { round: number; match: number; slot: 'A' | 'B' } | null {
  const nextRound = currentRound + 1;

  if (currentRound % 2 === 1) {
    // Odd round → even round (elimination → feed)
    // Same match number, team A slot (WR losers go to team B)
    return {
      round: nextRound,
      match: matchNumber,
      slot: 'A',
    };
  } else {
    // Even round → odd round (feed → elimination)
    // Match number halves, slot based on odd/even
    const nextMatchNumber = Math.ceil(matchNumber / 2);
    return {
      round: nextRound,
      match: nextMatchNumber,
      slot: matchNumber % 2 === 1 ? 'A' : 'B',
    };
  }
}

/**
 * Place a team into the correct slot of a target match.
 * Won't overwrite if the slot is already occupied.
 */
async function placeTeamInMatch(
  bracketMatches: DBMatch[],
  targetRound: number,
  targetMatchNumber: number,
  teamId: string,
  slot: 'A' | 'B',
) {
  const targetMatch = bracketMatches.find(
    (m) => m.round === targetRound && m.matchNumber === targetMatchNumber
  );

  if (!targetMatch) return;

  // Don't overwrite existing placements
  if (slot === 'A' && targetMatch.teamAId) return;
  if (slot === 'B' && targetMatch.teamBId) return;

  await db.match.update({
    where: { id: targetMatch.id },
    data: slot === 'A' ? { teamAId: teamId } : { teamBId: teamId },
  });
}

// ──────────────────────────────────────────────────────────────────
// Group Stage: Calculate Standings & Transition to Playoff
// ──────────────────────────────────────────────────────────────────

interface TeamStanding {
  teamId: string;
  teamName: string;
  groupRound: number;       // round number = groupIndex + 1
  wins: number;
  losses: number;
  pointsFor: number;        // total score scored
  pointsAgainst: number;    // total score conceded
  pointDiff: number;        // pointsFor - pointsAgainst
}

/**
 * Calculate standings for all groups in a tournament.
 * Teams are grouped by `round` field (round 1 = Group A, round 2 = Group B, etc.)
 */
async function calculateGroupStandings(tournamentId: string): Promise<Map<number, TeamStanding[]>> {
  const groupMatches = await db.match.findMany({
    where: { tournamentId, bracket: 'group' },
    include: { teamA: true, teamB: true },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  // Build standings per group (group = round number)
  const standingsMap = new Map<number, Map<string, TeamStanding>>();

  for (const match of groupMatches) {
    const groupRound = match.round;
    if (!standingsMap.has(groupRound)) standingsMap.set(groupRound, new Map());

    const groupStandings = standingsMap.get(groupRound)!;

    // Initialize team A if not present
    if (match.teamAId && !groupStandings.has(match.teamAId)) {
      groupStandings.set(match.teamAId, {
        teamId: match.teamAId,
        teamName: match.teamA?.name || `Team ${match.teamAId.slice(0, 4)}`,
        groupRound,
        wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0,
      });
    }
    // Initialize team B if not present
    if (match.teamBId && !groupStandings.has(match.teamBId)) {
      groupStandings.set(match.teamBId, {
        teamId: match.teamBId,
        teamName: match.teamB?.name || `Team ${match.teamBId.slice(0, 4)}`,
        groupRound,
        wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0,
      });
    }

    // Only count completed matches
    if (match.status === 'completed' && match.winnerId && match.teamAId && match.teamBId) {
      const scoreA = match.scoreA ?? 0;
      const scoreB = match.scoreB ?? 0;
      const standingA = groupStandings.get(match.teamAId)!;
      const standingB = groupStandings.get(match.teamBId)!;

      standingA.pointsFor += scoreA;
      standingA.pointsAgainst += scoreB;
      standingB.pointsFor += scoreB;
      standingB.pointsAgainst += scoreA;

      if (match.winnerId === match.teamAId) {
        standingA.wins++;
        standingB.losses++;
      } else {
        standingB.wins++;
        standingA.losses++;
      }
    }

    // Update point diffs
    for (const standing of groupStandings.values()) {
      standing.pointDiff = standing.pointsFor - standing.pointsAgainst;
    }
  }

  // Convert to sorted arrays per group
  const result = new Map<number, TeamStanding[]>();
  for (const [groupRound, teamMap] of standingsMap) {
    const sorted = Array.from(teamMap.values()).sort((a, b) => {
      // Primary: wins (desc)
      if (b.wins !== a.wins) return b.wins - a.wins;
      // Tiebreaker 1: head-to-head result (check if they played each other)
      const h2h = getHeadToHeadResult(groupMatches, groupRound, a.teamId, b.teamId);
      if (h2h !== 0) return h2h;
      // Tiebreaker 2: point differential (desc)
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      // Tiebreaker 3: points for (desc)
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      return 0;
    });
    result.set(groupRound, sorted);
  }

  return result;
}

/**
 * Get head-to-head result between two teams in a specific group.
 * Returns 1 if teamA won, -1 if teamB won, 0 if no match found.
 */
function getHeadToHeadResult(
  groupMatches: { round: number; teamAId: string | null; teamBId: string | null; winnerId: string | null; status: string }[],
  groupRound: number,
  teamAId: string,
  teamBId: string,
): number {
  for (const match of groupMatches) {
    if (match.round !== groupRound) continue;
    if (match.status !== 'completed' || !match.winnerId) continue;

    const hasA = match.teamAId === teamAId && match.teamBId === teamBId;
    const hasB = match.teamAId === teamBId && match.teamBId === teamAId;

    if (hasA || hasB) {
      // For the original function call perspective: return 1 if teamA won, -1 if teamB won
      if (match.winnerId === teamAId) return 1;
      if (match.winnerId === teamBId) return -1;
    }
  }
  return 0;
}

/**
 * Check if all group stage matches are completed.
 * If yes, calculate standings and populate playoff bracket first round.
 */
async function checkAndTransitionToPlayoff(tournamentId: string) {
  // Fetch ALL group matches to check if all are completed
  const groupMatches = await db.match.findMany({
    where: { tournamentId, bracket: 'group' },
    select: { id: true, status: true },
  });

  const allCompleted = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'completed');
  if (!allCompleted) return;

  // Check if playoff matches already have teams (don't re-populate)
  const playoffFirstRound = await db.match.findMany({
    where: { tournamentId, bracket: 'playoff' },
    orderBy: { round: 'asc' },
  });

  if (playoffFirstRound.length === 0) return;

  const minPlayoffRound = Math.min(...playoffFirstRound.map((m) => m.round));
  const firstPlayoffMatches = playoffFirstRound.filter((m) => m.round === minPlayoffRound);

  // Check if any playoff match already has teams populated
  const alreadyPopulated = firstPlayoffMatches.some((m) => m.teamAId || m.teamBId);
  if (alreadyPopulated) return;

  // Calculate standings
  const standingsMap = await calculateGroupStandings(tournamentId);

  // Collect top 2 from each group
  const qualifiedTeams: { teamId: string; groupRound: number; rank: number }[] = [];
  for (const [groupRound, standings] of standingsMap) {
    // Top 2 qualify
    const topN = Math.min(2, standings.length);
    for (let i = 0; i < topN; i++) {
      qualifiedTeams.push({
        teamId: standings[i].teamId,
        groupRound,
        rank: i + 1,
      });
    }
  }

  if (qualifiedTeams.length < 2) {
    console.log('[GroupStage] Not enough qualified teams for playoff');
    return;
  }

  // Sort groups by round number to get deterministic ordering
  const sortedGroups = [...standingsMap.keys()].sort((a, b) => a - b);

  // Build seeding for playoff: 1st of group A vs 2nd of group B, 1st of group B vs 2nd of group A, etc.
  // Cross-seed pattern for 2+ groups
  const playoffSeeds: { teamId: string; playoffSlot: 'A' | 'B'; matchIndex: number }[] = [];

  if (sortedGroups.length >= 2) {
    // Cross-seed: pair groups (0,1), (2,3), etc.
    for (let i = 0; i < sortedGroups.length; i += 2) {
      const groupA = sortedGroups[i];
      const groupB = sortedGroups[i + 1]; // may be undefined if odd number of groups

      const standingsA = standingsMap.get(groupA) || [];
      const standingsB = standingsMap.get(groupB) || [];

      const matchIdx = Math.floor(i / 2);

      // 1st of group A vs 2nd of group B
      if (standingsA.length >= 1) {
        playoffSeeds.push({ teamId: standingsA[0].teamId, playoffSlot: 'A', matchIndex: matchIdx });
      }
      if (standingsB.length >= 2) {
        playoffSeeds.push({ teamId: standingsB[1].teamId, playoffSlot: 'B', matchIndex: matchIdx });
      }

      // If group B exists: 1st of group B vs 2nd of group A
      if (standingsB.length >= 1 && standingsA.length >= 2) {
        // Use next match index if we already used matchIdx
        const nextMatchIdx = firstPlayoffMatches.length > playoffSeeds.filter(s => s.matchIndex === matchIdx).length
          ? matchIdx + 1
          : matchIdx;

        // Only add if we have enough playoff match slots
        if (nextMatchIdx < firstPlayoffMatches.length) {
          playoffSeeds.push({ teamId: standingsB[0].teamId, playoffSlot: 'A', matchIndex: nextMatchIdx });
          playoffSeeds.push({ teamId: standingsA[1].teamId, playoffSlot: 'B', matchIndex: nextMatchIdx });
        } else if (matchIdx + 1 < firstPlayoffMatches.length) {
          playoffSeeds.push({ teamId: standingsB[0].teamId, playoffSlot: 'A', matchIndex: matchIdx + 1 });
          playoffSeeds.push({ teamId: standingsA[1].teamId, playoffSlot: 'B', matchIndex: matchIdx + 1 });
        }
      }
    }
  } else {
    // Single group: just take top 2, put them in match 1
    const standings = standingsMap.get(sortedGroups[0]) || [];
    if (standings.length >= 1) playoffSeeds.push({ teamId: standings[0].teamId, playoffSlot: 'A', matchIndex: 0 });
    if (standings.length >= 2) playoffSeeds.push({ teamId: standings[1].teamId, playoffSlot: 'B', matchIndex: 0 });
  }

  // Place teams into playoff first-round matches
  for (const seed of playoffSeeds) {
    const targetMatch = firstPlayoffMatches[seed.matchIndex];
    if (!targetMatch) continue;

    const updateData: Record<string, string> = {};
    if (seed.playoffSlot === 'A' && !targetMatch.teamAId) {
      updateData.teamAId = seed.teamId;
    } else if (seed.playoffSlot === 'B' && !targetMatch.teamBId) {
      updateData.teamBId = seed.teamId;
    }

    if (Object.keys(updateData).length > 0) {
      await db.match.update({ where: { id: targetMatch.id }, data: updateData });
    }
  }

  console.log(`[GroupStage] Playoff populated! ${qualifiedTeams.length} teams qualified from ${sortedGroups.length} groups`);
}

// ──────────────────────────────────────────────────────────────────
// Award Points on Match Completion
// ──────────────────────────────────────────────────────────────────

interface MatchWithTeams {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  tournamentId: string;
  status: string;
}

async function awardMatchPoints(
  match: MatchWithTeams,
  winnerTeamId: string,
  mvpUserId: string | null,
) {
  // Skip if match was already completed (points already awarded)
  if (match.status === 'completed') return;

  const loserTeamId = match.teamAId === winnerTeamId ? match.teamBId : match.teamAId;

  // Fetch winning team members
  const winnerMembers = await db.teamMember.findMany({
    where: { teamId: winnerTeamId },
    select: { userId: true },
  });

  // Fetch losing team members
  const loserMembers = loserTeamId
    ? await db.teamMember.findMany({
        where: { teamId: loserTeamId },
        select: { userId: true },
      })
    : [];

  // Process all point updates in a transaction
  await db.$transaction(async (tx) => {
    // Award WIN points to winning team members
    for (const member of winnerMembers) {
      await tx.user.update({
        where: { id: member.userId },
        data: { points: { increment: POINTS_CONFIG.win } },
      });
      // Update or create ranking
      await tx.ranking.upsert({
        where: { userId: member.userId },
        create: { userId: member.userId, points: POINTS_CONFIG.win, wins: 1 },
        update: { points: { increment: POINTS_CONFIG.win }, wins: { increment: 1 } },
      });
    }

    // Award LOSS points to losing team members
    for (const member of loserMembers) {
      await tx.user.update({
        where: { id: member.userId },
        data: { points: { increment: POINTS_CONFIG.loss } },
      });
      await tx.ranking.upsert({
        where: { userId: member.userId },
        create: { userId: member.userId, points: POINTS_CONFIG.loss, losses: 1 },
        update: { points: { increment: POINTS_CONFIG.loss }, losses: { increment: 1 } },
      });
    }

    // Award MVP bonus (must be a member of the winning team)
    if (mvpUserId && winnerMembers.some(m => m.userId === mvpUserId)) {
      await tx.user.update({
        where: { id: mvpUserId },
        data: {
          points: { increment: POINTS_CONFIG.mvpBonus },
          isMVP: true,
        },
      });
      await tx.ranking.upsert({
        where: { userId: mvpUserId },
        create: { userId: mvpUserId, points: POINTS_CONFIG.mvpBonus },
        update: { points: { increment: POINTS_CONFIG.mvpBonus } },
      });
    }
  });

  console.log(
    `[Points] Match ${match.id}: +${POINTS_CONFIG.win}pts x${winnerMembers.length} winners` +
    (loserMembers.length ? `, +${POINTS_CONFIG.loss}pts x${loserMembers.length} losers` : '') +
    (mvpUserId ? `, +${POINTS_CONFIG.mvpBonus}pts MVP` : '')
  );
}
