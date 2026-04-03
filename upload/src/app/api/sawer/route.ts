import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerNewSawer } from '@/lib/pusher';

// GET /api/sawer — fetch recent confirmed sawer feed
export async function GET() {
  try {
    const sawerList = await db.sawer.findMany({
      where: {
        paymentStatus: 'confirmed',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Only sum confirmed sawer amounts
    const totalSawer = await db.sawer.aggregate({
      where: {
        paymentStatus: 'confirmed',
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      sawerList,
      totalSawer: totalSawer._sum.amount || 0,
    });
  } catch (error) {
    console.error('[SAWER GET]', error);
    return NextResponse.json({ error: 'Gagal memuat sawer' }, { status: 500 });
  }
}

// POST /api/sawer — create a new sawer (tip) — prize pool updated on payment confirmation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderName, senderAvatar, targetPlayerId, targetPlayerName, amount, message, tournamentId, division, paymentMethod, proofImageUrl } = body;

    if (!senderName || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Nama pengirim dan nominal wajib diisi' },
        { status: 400 },
      );
    }

    const sawerAmount = Number(amount);

    // Create sawer record with pending status
    const sawer = await db.sawer.create({
      data: {
        tournamentId: tournamentId || null,
        senderName: String(senderName).slice(0, 50),
        senderAvatar: senderAvatar || null,
        targetPlayerId: targetPlayerId || null,
        targetPlayerName: targetPlayerName ? String(targetPlayerName).slice(0, 50) : null,
        amount: sawerAmount,
        message: message ? String(message).slice(0, 200) : null,
        paymentMethod: paymentMethod || 'qris',
        paymentStatus: 'pending',
        proofImageUrl: proofImageUrl || null,
      },
    });

    // Broadcast via Pusher — fire and forget
    // NOTE: Prize pool is NOT updated here — it updates when payment is confirmed
    try {
      triggerNewSawer(tournamentId, {
        ...sawer,
        amount: sawerAmount,
      }).catch(() => {});
    } catch {}

    return NextResponse.json(sawer, { status: 201 });
  } catch (error) {
    console.error('[SAWER POST]', error);
    return NextResponse.json({ error: 'Gagal menyimpan sawer' }, { status: 500 });
  }
}
