import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

// POST - Admin login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    // Normalize inputs — trim whitespace, ensure strings
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password);

    // Hash input password with SHA-256 for comparison
    const inputHash = createHash('sha256').update(cleanPassword).digest('hex');

    const user = await db.user.findFirst({
      where: {
        name: cleanUsername,
        role: { in: ['admin', 'super_admin'] },
        adminPass: inputHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isAdmin: true,
        avatar: true,
        tier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Username atau password salah' }, { status: 401 });
    }

    const permissions = JSON.parse(user.permissions || '{}');

    return NextResponse.json({
      success: true,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
        avatar: user.avatar,
        tier: user.tier,
      },
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ success: false, error: 'Gagal login' }, { status: 500 });
  }
}

// GET - List all admins
export async function GET() {
  try {
    const admins = await db.user.findMany({
      where: { role: { in: ['admin', 'super_admin'] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isAdmin: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const parsed = admins.map((a) => ({
      ...a,
      permissions: JSON.parse(a.permissions || '{}'),
    }));

    return NextResponse.json({ success: true, admins: parsed });
  } catch (error) {
    console.error('List admins error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data admin' }, { status: 500 });
  }
}
