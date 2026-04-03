import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Verify admin session - check if the stored credentials are still valid.
 * This helps detect when admin password was changed or account was deleted.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, adminHash } = body;

    if (!adminId || !adminHash) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Missing credentials',
      }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['admin', 'super_admin'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        adminPass: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Admin account not found or no longer has admin privileges',
      });
    }

    if (user.adminPass !== adminHash) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Session expired - password changed. Please login again.',
        passwordChanged: true,
      });
    }

    const permissions = JSON.parse(user.permissions || '{}');

    return NextResponse.json({
      success: true,
      valid: true,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
      },
    });
  } catch (error) {
    console.error('Verify session error:', error);
    return NextResponse.json({
      success: false,
      valid: false,
      error: 'Verification failed',
    }, { status: 500 });
  }
}
