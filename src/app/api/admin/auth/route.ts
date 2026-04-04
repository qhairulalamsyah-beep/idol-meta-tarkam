import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { authLogger, apiLogger } from '@/lib/logger';

// POST - Admin login with PIN
export async function POST(request: NextRequest) {
  const timer = apiLogger.startTimer();
  apiLogger.request('POST', '/api/admin/auth');
  
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      authLogger.warn('Login attempt without PIN');
      apiLogger.response('POST', '/api/admin/auth', 400, timer());
      return NextResponse.json({ success: false, error: 'PIN wajib diisi' }, { status: 400 });
    }

    // Normalize PIN - ensure it's a string of digits
    const cleanPin = String(pin).trim();

    // PIN must be exactly 6 digits
    if (!/^\d{6}$/.test(cleanPin)) {
      authLogger.warn('Invalid PIN format', { pinLength: cleanPin.length });
      apiLogger.response('POST', '/api/admin/auth', 400, timer());
      return NextResponse.json({ success: false, error: 'PIN harus 6 digit angka' }, { status: 400 });
    }

    // Hash input PIN with SHA-256 for comparison
    const inputHash = createHash('sha256').update(cleanPin).digest('hex');

    // Find admin with matching PIN
    const user = await db.user.findFirst({
      where: {
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
      authLogger.warn('Failed login attempt - invalid PIN');
      apiLogger.response('POST', '/api/admin/auth', 401, timer());
      return NextResponse.json({ success: false, error: 'PIN salah' }, { status: 401 });
    }

    authLogger.info('Admin logged in successfully', {
      userId: user.id,
      name: user.name,
      role: user.role,
    });
    
    apiLogger.response('POST', '/api/admin/auth', 200, timer());

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
    authLogger.error('Admin auth error', error);
    apiLogger.response('POST', '/api/admin/auth', 500, timer());
    return NextResponse.json({ success: false, error: 'Gagal login' }, { status: 500 });
  }
}

// GET - List all admins
export async function GET() {
  const timer = apiLogger.startTimer();
  apiLogger.request('GET', '/api/admin/auth');
  
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

    authLogger.debug('Listed admins', { count: parsed.length });
    apiLogger.response('GET', '/api/admin/auth', 200, timer());

    return NextResponse.json({ success: true, admins: parsed });
  } catch (error) {
    authLogger.error('List admins error', error);
    apiLogger.response('GET', '/api/admin/auth', 500, timer());
    return NextResponse.json({ success: false, error: 'Gagal mengambil data admin' }, { status: 500 });
  }
}
