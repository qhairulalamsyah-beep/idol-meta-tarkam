import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

// POST - Verify current PIN (for change PIN flow)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json({ valid: false, error: 'PIN wajib diisi' }, { status: 400 });
    }

    // Normalize PIN
    const cleanPin = String(pin).trim();

    // PIN must be exactly 6 digits
    if (!/^\d{6}$/.test(cleanPin)) {
      return NextResponse.json({ valid: false, error: 'PIN harus 6 digit angka' }, { status: 400 });
    }

    // Hash input PIN
    const inputHash = createHash('sha256').update(cleanPin).digest('hex');

    // Find admin with matching PIN
    const user = await db.user.findFirst({
      where: {
        role: { in: ['admin', 'super_admin'] },
        adminPass: inputHash,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ valid: false, error: 'PIN salah' }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Verify PIN error:', error);
    return NextResponse.json({ valid: false, error: 'Gagal memverifikasi PIN' }, { status: 500 });
  }
}
