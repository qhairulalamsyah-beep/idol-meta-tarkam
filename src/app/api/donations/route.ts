import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { triggerNewDonation } from '@/lib/pusher';

// GET - Get donations (only confirmed, for Liga Season 2 funding)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const donations = await db.donation.findMany({
      where: {
        paymentStatus: 'confirmed',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Calculate total donation from confirmed only
    const totalDonation = await db.donation.aggregate({
      where: {
        paymentStatus: 'confirmed',
      },
      _sum: {
        amount: true,
      },
    });

    // Count pending donations for admin display
    const pendingCount = await db.donation.count({
      where: {
        paymentStatus: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      donations,
      totalDonation: totalDonation._sum.amount || 0,
      pendingCount,
    });
  } catch (error) {
    console.error('Error fetching donations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch donations' },
      { status: 500 }
    );
  }
}

// POST - Create donation (for Liga Season 2 funding)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, message, anonymous, tournamentId, paymentMethod, proofImageUrl } = body;

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const donation = await db.donation.create({
      data: {
        id: uuidv4(),
        userId: anonymous ? null : userId,
        amount: parseFloat(amount),
        message: message || '',
        anonymous: anonymous || false,
        paymentMethod: paymentMethod || 'qris',
        paymentStatus: 'pending',
        proofImageUrl: proofImageUrl || null,
      },
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

    // Broadcast via Pusher — fire and forget
    triggerNewDonation(tournamentId, {
      amount: donation.amount,
      userName: donation.user?.name || 'Anonymous',
      message: donation.message || undefined,
      tournamentId,
    }).catch(() => {});

    return NextResponse.json({ success: true, donation });
  } catch (error) {
    console.error('Error creating donation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create donation' },
      { status: 500 }
    );
  }
}
