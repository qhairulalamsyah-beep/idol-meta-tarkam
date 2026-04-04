import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Debug registrations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tournamentId = searchParams.get('tournamentId');
    const name = searchParams.get('name');

    // Find user by name
    if (name) {
      const users = await db.user.findMany({
        where: {
          name: { equals: name, mode: 'insensitive' }
        },
        include: {
          registrations: {
            include: {
              tournament: true
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        users: users.map(u => ({
          id: u.id,
          name: u.name,
          phone: u.phone,
          whatsappJid: u.whatsappJid,
          gender: u.gender,
          registrations: u.registrations.map(r => ({
            id: r.id,
            status: r.status,
            tournamentId: r.tournamentId,
            tournamentName: r.tournament.name,
            tournamentStatus: r.tournament.status
          }))
        }))
      });
    }

    // Find registrations for specific user + tournament
    if (userId && tournamentId) {
      const registration = await db.registration.findUnique({
        where: {
          userId_tournamentId: { userId, tournamentId }
        },
        include: {
          user: true,
          tournament: true
        }
      });

      return NextResponse.json({
        success: true,
        registration: registration ? {
          id: registration.id,
          status: registration.status,
          user: {
            id: registration.user.id,
            name: registration.user.name,
            phone: registration.user.phone
          },
          tournament: {
            id: registration.tournament.id,
            name: registration.tournament.name,
            status: registration.tournament.status
          }
        } : null
      });
    }

    // Get all tournaments with registration counts
    const tournaments = await db.tournament.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      tournaments: tournaments.map(t => ({
        id: t.id,
        name: t.name,
        division: t.division,
        status: t.status,
        createdAt: t.createdAt,
        registrationCount: t._count.registrations
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Remove registration (for cleanup)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tournamentId = searchParams.get('tournamentId');

    if (!userId || !tournamentId) {
      return NextResponse.json(
        { success: false, error: 'userId and tournamentId required' },
        { status: 400 }
      );
    }

    const result = await db.registration.deleteMany({
      where: { userId, tournamentId }
    });

    return NextResponse.json({
      success: true,
      deleted: result.count
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
