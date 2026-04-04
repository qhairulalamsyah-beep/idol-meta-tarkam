import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Debug current tournament selection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division') || 'male';

    // Get all tournaments for this division
    const allTournaments = await db.tournament.findMany({
      where: { division },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });

    // Get the "current" tournament (same logic as frontend)
    const currentTournament = allTournaments.find(t => t.status !== 'completed') || allTournaments[0] || null;

    return NextResponse.json({
      success: true,
      division,
      allTournaments: allTournaments.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt,
        registrationCount: t._count.registrations
      })),
      currentTournament: currentTournament ? {
        id: currentTournament.id,
        name: currentTournament.name,
        status: currentTournament.status,
        registrationCount: currentTournament._count.registrations
      } : null,
      message: currentTournament
        ? `Tournament "${currentTournament.name}" (${currentTournament.status}) akan digunakan untuk pendaftaran`
        : 'Tidak ada tournament aktif'
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
