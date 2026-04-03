import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

// PUT - Change own password (requires current password verification)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, currentPassword, newPassword } = body;

    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Semua field wajib diisi' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ success: false, error: 'Password baru minimal 4 karakter' }, { status: 400 });
    }

    const currentHash = createHash('sha256').update(currentPassword).digest('hex');

    const user = await db.user.findFirst({
      where: {
        name: String(username).trim(),
        role: { in: ['admin', 'super_admin'] },
        adminPass: currentHash,
      },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Password saat ini salah' }, { status: 401 });
    }

    const newHash = createHash('sha256').update(newPassword).digest('hex');
    await db.user.update({
      where: { id: user.id },
      data: { adminPass: newHash },
    });

    return NextResponse.json({ success: true, message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengubah password' }, { status: 500 });
  }
}
