import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

// PUT - Change admin PIN
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPin, newPin } = body;

    if (!currentPin || !newPin) {
      return NextResponse.json({ success: false, error: 'PIN lama dan baru wajib diisi' }, { status: 400 });
    }

    // Normalize PINs
    const cleanCurrentPin = String(currentPin).trim();
    const cleanNewPin = String(newPin).trim();

    // Validate PINs
    if (!/^\d{6}$/.test(cleanCurrentPin)) {
      return NextResponse.json({ success: false, error: 'PIN lama harus 6 digit angka' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(cleanNewPin)) {
      return NextResponse.json({ success: false, error: 'PIN baru harus 6 digit angka' }, { status: 400 });
    }

    // Hash current PIN
    const currentHash = createHash('sha256').update(cleanCurrentPin).digest('hex');

    // Find admin with matching current PIN
    const user = await db.user.findFirst({
      where: {
        role: { in: ['admin', 'super_admin'] },
        adminPass: currentHash,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'PIN lama salah' }, { status: 401 });
    }

    // Hash new PIN
    const newHash = createHash('sha256').update(cleanNewPin).digest('hex');

    // Update PIN
    await db.user.update({
      where: { id: user.id },
      data: { adminPass: newHash },
    });

    return NextResponse.json({ success: true, message: 'PIN berhasil diubah' });
  } catch (error) {
    console.error('Change PIN error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengubah PIN' }, { status: 500 });
  }
}
