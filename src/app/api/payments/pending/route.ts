import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/payments/pending — return pending donations + sawer with user info
export async function GET() {
  try {
    // Fetch pending donations with user info
    const pendingDonations = await db.donation.findMany({
      where: {
        paymentStatus: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Fetch pending sawer
    const pendingSawer = await db.sawer.findMany({
      where: {
        paymentStatus: 'pending',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Format donations
    const donations = pendingDonations.map((d) => ({
      id: d.id,
      type: 'donation' as const,
      amount: d.amount,
      message: d.message,
      paymentMethod: d.paymentMethod,
      proofImageUrl: d.proofImageUrl,
      from: d.anonymous ? 'Anonim' : (d.user?.name || 'Anonim'),
      fromAvatar: d.anonymous ? null : (d.user?.avatar || null),
      createdAt: d.createdAt.toISOString(),
    }));

    // Format sawer
    const sawer = pendingSawer.map((s) => ({
      id: s.id,
      type: 'sawer' as const,
      amount: s.amount,
      message: s.message,
      paymentMethod: s.paymentMethod,
      proofImageUrl: s.proofImageUrl,
      from: s.senderName,
      fromAvatar: s.senderAvatar,
      targetPlayerName: s.targetPlayerName,
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      payments: [...donations, ...sawer].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      totalPending: donations.length + sawer.length,
    });
  } catch (error) {
    console.error('[PAYMENTS PENDING]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending payments' },
      { status: 500 },
    );
  }
}
