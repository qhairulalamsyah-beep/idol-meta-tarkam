import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerPrizePoolUpdate, triggerNewDonation, triggerNewSawer } from '@/lib/pusher';

// PUT /api/payments/confirm — confirm or reject a payment
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, status } = body;

    // Validate required fields
    if (!type || !id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, id, status' },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== 'donation' && type !== 'sawer') {
      return NextResponse.json(
        { success: false, error: 'Type must be "donation" or "sawer"' },
        { status: 400 }
      );
    }

    // Validate status
    if (status !== 'confirmed' && status !== 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Status must be "confirmed" or "rejected"' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      paymentStatus: status,
    };

    // Set paidAt only for confirmed payments
    if (status === 'confirmed') {
      updateData.paidAt = new Date();
    }

    if (type === 'donation') {
      // Find the donation first
      const donation = await db.donation.findUnique({
        where: { id },
      });

      if (!donation) {
        return NextResponse.json(
          { success: false, error: 'Donation not found' },
          { status: 404 }
        );
      }

      // Prevent double-processing
      if (donation.paymentStatus !== 'pending') {
        return NextResponse.json(
          { success: false, error: `Donation already ${donation.paymentStatus}` },
          { status: 400 }
        );
      }

      // Update donation payment status
      const updatedDonation = await db.donation.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      // Donation confirmed — prize pool NOT updated
      // Donasi = dana penyelenggaraan liga (bukan prize pool)
      // Hanya Sawer yang otomatis menambah prize pool
      if (status === 'confirmed') {
        // Just broadcast confirmation via Pusher (no prize pool update)
        triggerNewDonation(undefined, {
          amount: donation.amount,
          userName: updatedDonation.user?.name || 'Anonymous',
          message: donation.message || undefined,
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        record: updatedDonation,
      });
    }

    // type === 'sawer'
    const sawer = await db.sawer.findUnique({
      where: { id },
    });

    if (!sawer) {
      return NextResponse.json(
        { success: false, error: 'Sawer not found' },
        { status: 404 }
      );
    }

    // Prevent double-processing
    if (sawer.paymentStatus !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Sawer already ${sawer.paymentStatus}` },
        { status: 400 }
      );
    }

    // Update sawer payment status
    const updatedSawer = await db.sawer.update({
      where: { id },
      data: updateData,
    });

    // If confirmed, update tournament prize pool
    if (status === 'confirmed') {
      // Use tournamentId from the sawer DB record (stored during creation)
      // Falls back to body.tournamentId for backward compatibility
      const tournamentId = sawer.tournamentId || body.tournamentId;
      let updatedTournament = null;

      if (tournamentId) {
        updatedTournament = await db.tournament.update({
          where: { id: tournamentId },
          data: {
            prizePool: {
              increment: sawer.amount,
            },
          },
        });
      } else {
        // No tournamentId on sawer record — find the latest active/ongoing tournament
        const tournament = await db.tournament.findFirst({
          where: {
            status: { in: ['setup', 'registration', 'ongoing'] },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (tournament) {
          updatedTournament = await db.tournament.update({
            where: { id: tournament.id },
            data: {
              prizePool: {
                increment: sawer.amount,
              },
          },
        });
        }
      }

      // Broadcast prize pool update via Pusher
      if (updatedTournament) {
        triggerPrizePoolUpdate({ totalPrizePool: updatedTournament.prizePool }).catch(() => {});
      }

      // Re-broadcast sawer as confirmed
      triggerNewSawer(tournamentId, {
        ...updatedSawer,
        amount: sawer.amount,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      record: updatedSawer,
    });
  } catch (error) {
    console.error('[PAYMENTS CONFIRM]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process payment confirmation' },
      { status: 500 }
    );
  }
}
