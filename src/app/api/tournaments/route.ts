import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { triggerTournamentUpdate } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';
import { apiLogger, dbLogger } from '@/lib/logger';

// GET - Get tournaments
export async function GET(request: NextRequest) {
  const timer = apiLogger.startTimer();
  apiLogger.request('GET', '/api/tournaments');
  
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id');
    const status = searchParams.get('status');
    const division = searchParams.get('division');
    const type = searchParams.get('type');

    if (tournamentId) {
      dbLogger.debug('Fetching tournament by ID', { tournamentId });
      
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
      
      apiLogger.response('GET', '/api/tournaments', 200, timer());
      return NextResponse.json({ success: true, tournament });
    }

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (division) where.division = division;
    if (type) where.type = type;

    dbLogger.debug('Fetching tournaments', { filters: where });
    
    const tournaments = await db.tournament.findMany({
      where,
      include: {
        _count: {
          select: { registrations: true, teams: true, matches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    apiLogger.response('GET', '/api/tournaments', 200, timer());
    return NextResponse.json({ success: true, tournaments });
  } catch (error) {
    dbLogger.error('Error fetching tournaments', error);
    apiLogger.response('GET', '/api/tournaments', 500, timer());
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

  const timer = apiLogger.startTimer();
  apiLogger.request('POST', '/api/tournaments');

  try {
    const body = await request.json();
    const { name, division, type, bracketType, week, startDate, prizePool, mode, bpm, lokasi } = body;

    dbLogger.info('Creating tournament', { division, type, week });

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

    dbLogger.info('Tournament created', { tournamentId: tournament.id, name: tournament.name });
    apiLogger.response('POST', '/api/tournaments', 201, timer());

    return NextResponse.json({ success: true, tournament });
  } catch (error) {
    dbLogger.error('Error creating tournament', error);
    apiLogger.response('POST', '/api/tournaments', 500, timer());
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

  const timer = apiLogger.startTimer();
  apiLogger.request('PUT', '/api/tournaments');

  try {
    const body = await request.json();
    const { tournamentId, status, prizePool, name, type, bracketType, week, startDate, mode, bpm, lokasi } = body;

    if (!tournamentId) {
      apiLogger.response('PUT', '/api/tournaments', 400, timer());
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

    dbLogger.debug('Updating tournament', { tournamentId, updates: Object.keys(updateData) });

    const tournament = await db.tournament.update({
      where: { id: tournamentId },
      data: updateData,
    });

    triggerTournamentUpdate(tournament.division, { action: 'updated', tournamentId: tournament.id, division: tournament.division }).catch(() => {});

    dbLogger.info('Tournament updated', { tournamentId, status: tournament.status });
    apiLogger.response('PUT', '/api/tournaments', 200, timer());

    return NextResponse.json({ success: true, tournament });
  } catch (error) {
    dbLogger.error('Error updating tournament', error);
    apiLogger.response('PUT', '/api/tournaments', 500, timer());
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

  const timer = apiLogger.startTimer();
  apiLogger.request('DELETE', '/api/tournaments');

  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id');

    if (!tournamentId) {
      apiLogger.response('DELETE', '/api/tournaments', 400, timer());
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
      apiLogger.response('DELETE', '/api/tournaments', 404, timer());
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    dbLogger.info('Deleting tournament', { tournamentId, division: existing.division });

    // Delete in correct order to respect foreign key constraints
    // PlayerMatchStat -> Match (cascade) -> TeamMember -> Team -> Registration -> Tournament
    await db.playerMatchStat.deleteMany({ where: { match: { tournamentId } } });
    await db.match.deleteMany({ where: { tournamentId } });
    await db.teamMember.deleteMany({ where: { team: { tournamentId } } });
    await db.team.deleteMany({ where: { tournamentId } });
    await db.registration.deleteMany({ where: { tournamentId } });
    await db.tournament.delete({ where: { id: tournamentId } });

    triggerTournamentUpdate(existing.division, { action: 'deleted', tournamentId, division: existing.division }).catch(() => {});

    dbLogger.info('Tournament deleted', { tournamentId });
    apiLogger.response('DELETE', '/api/tournaments', 200, timer());

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    dbLogger.error('Error deleting tournament', error);
    apiLogger.response('DELETE', '/api/tournaments', 500, timer());
    return NextResponse.json(
      { success: false, error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}
