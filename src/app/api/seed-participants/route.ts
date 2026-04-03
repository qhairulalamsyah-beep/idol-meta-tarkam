import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// POST - Seed participants for testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tournamentId, division } = body;

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'tournamentId required' },
        { status: 400 }
      );
    }

    // Check tournament exists
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Define participants with tier distribution
    // Each team needs: 1x S + 1x A + 1x B
    // We'll create 12 participants (4 teams): 4x S, 4x A, 4x B
    const participants = [
      // Tier S (4 players)
      { name: 'Alpha', tier: 'S' },
      { name: 'Blaze', tier: 'S' },
      { name: 'Crusher', tier: 'S' },
      { name: 'Demon', tier: 'S' },
      // Tier A (4 players)
      { name: 'Eagle', tier: 'A' },
      { name: 'Falcon', tier: 'A' },
      { name: 'Ghost', tier: 'A' },
      { name: 'Hunter', tier: 'A' },
      // Tier B (4 players)
      { name: 'Ice', tier: 'B' },
      { name: 'Joker', tier: 'B' },
      { name: 'Knight', tier: 'B' },
      { name: 'Lightning', tier: 'B' },
    ];

    const createdUsers: Array<{ id: string; name: string; tier: string }> = [];
    const createdRegistrations: Array<{ id: string; userId: string; status: string; tierAssigned: string }> = [];

    for (const participant of participants) {
      // Create user
      const userId = uuidv4();
      await db.user.create({
        data: {
          id: userId,
          name: participant.name,
          email: `${participant.name.toLowerCase()}@idolmeta.test`,
          gender: division || 'male',
          tier: participant.tier,
          points: Math.floor(Math.random() * 1000),
        },
      });
      createdUsers.push({ id: userId, name: participant.name, tier: participant.tier });

      // Create registration
      const registrationId = uuidv4();
      await db.registration.create({
        data: {
          id: registrationId,
          userId,
          tournamentId,
          status: 'approved',
          tierAssigned: participant.tier,
        },
      });
      createdRegistrations.push({ id: registrationId, userId, status: 'approved', tierAssigned: participant.tier });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mendaftarkan ${createdUsers.length} peserta`,
      users: createdUsers,
      registrations: createdRegistrations,
    });
  } catch (error) {
    console.error('Error seeding participants:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed participants' },
      { status: 500 }
    );
  }
}
