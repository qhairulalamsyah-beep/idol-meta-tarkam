import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Verify that the request comes from an authenticated admin.
 *
 * The client sends:
 *   Header:    x-admin-id   — the admin's user ID
 *   Header:    x-admin-hash — SHA-256 of the admin password (stored in localStorage)
 *
 * We verify server-side that:
 *   1. The user exists and has role admin or super_admin
 *   2. The password hash matches what's in the DB
 *
 * Returns { admin } on success, or null on failure (caller should respond 401).
 */
export async function verifyAdmin(request: NextRequest): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
} | null> {
  try {
    const adminId = request.headers.get('x-admin-id');
    const adminHash = request.headers.get('x-admin-hash');

    console.log('[AdminGuard] Verifying admin:', {
      adminId: adminId ? `${adminId.slice(0, 8)}...` : null,
      adminHash: adminHash ? `${adminHash.slice(0, 8)}...` : null,
    });

    if (!adminId || !adminHash) {
      console.log('[AdminGuard] Missing headers - adminId:', !!adminId, 'adminHash:', !!adminHash);
      return null;
    }

    const user = await db.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['admin', 'super_admin'] },
        adminPass: adminHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isAdmin: true,
      },
    });

    if (!user) {
      // Debug: Check if user exists at all
      const userExists = await db.user.findUnique({
        where: { id: adminId },
        select: { id: true, role: true, adminPass: true },
      });
      console.log('[AdminGuard] User not found. Debug:', {
        userExists: !!userExists,
        userRole: userExists?.role,
        hashMatch: userExists?.adminPass === adminHash,
        storedHash: userExists?.adminPass ? `${userExists.adminPass.slice(0, 8)}...` : null,
        providedHash: `${adminHash.slice(0, 8)}...`,
      });
      return null;
    }

    console.log('[AdminGuard] Admin verified:', user.name, user.role);
    const permissions = JSON.parse(user.permissions || '{}');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions,
    };
  } catch (error) {
    console.error('[AdminGuard] Error:', error);
    return null;
  }
}

/**
 * Middleware helper — call at the top of any admin-only API route handler.
 * Returns an error response if not admin, or null if authorized.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak. Hanya admin yang bisa melakukan tindakan ini.' },
      { status: 401 },
    );
  }
  return null;
}
