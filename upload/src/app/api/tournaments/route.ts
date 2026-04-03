import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { triggerTournamentUpdate } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

// GET - Get tournaments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id');
    const status = searchParams.get('status');
    const division = searchParams.get('division');
    const type = searchParams.get('type');

    if (tournamentId) {
      const tournament = await db.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          registrations: {
            include: {
              user: {
                include: { rankings: true },
              },
            },
          },
          teams: {
            include: {
              members: {
                include: {
                  user: true,
                },
              },
            },
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
      });
      return NextResponse.json({ success: true, tournament });
    }

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (division) where.division = division;
    if (type) where.type = type;

    const tournaments = await db.tournament.findMany({
      where,
      include: {
        _count: {
          select: { registrations: true, teams: true, matches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}

// POST - Create tournament (admin only)
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name, division, type, bracketType, week, startDate, prizePool, mode, bpm, lokasi } = body;

    const tournament = await db.tournament.create({
      data: {
        id: uuidv4(),
        name: name || `${division === 'male' ? 'Male' : 'Female'} Division - Week ${week}`,
        division: division || 'male',
        type: type || 'weekly',
        status: 'setup',
        week: week || 1,
        bracketType: bracketType || 'single',
        prizePool: prizePool || 0,
        mode: mode || 'GR Arena 3vs3',
        bpm: bpm || '130',
        lokasi: lokasi || 'PUB 1',
        startDate: startDate ? new Date(startDate) : null,
      },
    });

    triggerTournamentUpdate(division || 'male', { action: 'created', tournamentId: tournament.id, division: division || 'male' }).catch(() => {});

    return NextResponse.json({ success: true, tournament });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}

// PUT - Update tournament (admin only)
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { tournamentId, status, prizePool, name, type, bracketType, week, startDate, mode, bpm, lokasi } = body;

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'tournamentId is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, string | number | Date | null | undefined> = {};
    if (status !== undefined) updateData.status = status;
    if (prizePool !== undefined) updateData.prizePool = prizePool;
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (bracketType !== undefined) updateData.bracketType = bracketType;
    if (week !== undefined) updateData.week = week;
    if (mode !== undefined) updateData.mode = mode;
    if (bpm !== undefined) updateData.bpm = bpm;
    if (lokasi !== undefined) updateData.lokasi = lokasi;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;

    const tournament = await db.tournament.update({
      where: { id: tournamentId },
      data: updateData,
    });

    triggerTournamentUpdate(tournament.division, { action: 'updated', tournamentId: tournament.id, division: tournament.division }).catch(() => {});

    return NextResponse.json({ success: true, tournament });
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a tournament (admin only)
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id');

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'tournamentId is required' },
        { status: 400 }
      );
    }

    // Find tournament first to get division for pusher
    const existing = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Delete in correct order to respect foreign key constraints
    // PlayerMatchStat -> Match (cascade) -> TeamMember -> Team -> Registration -> Tournament
    await db.playerMatchStat.deleteMany({ where: { match: { tournamentId } } });
    await db.match.deleteMany({ where: { tournamentId } });
    await db.teamMember.deleteMany({ where: { team: { tournamentId } } });
    await db.team.deleteMany({ where: { tournamentId } });
    await db.registration.deleteMany({ where: { tournamentId } });
    await db.tournament.delete({ where: { id: tournamentId } });

    triggerTournamentUpdate(existing.division, { action: 'deleted', tournamentId, division: existing.division }).catch(() => {});

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}
