import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authLogger } from '@/lib/logger';

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

    authLogger.debug('Verifying admin', {
      adminId: adminId ? `${adminId.slice(0, 8)}...` : null,
      hasHash: !!adminHash,
    });

    if (!adminId || !adminHash) {
      authLogger.warn('Admin verification failed: missing headers');
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
      
      authLogger.warn('Admin verification failed', {
        userExists: !!userExists,
        userRole: userExists?.role,
        hashMatch: userExists?.adminPass === adminHash,
      });
      
      return null;
    }

    authLogger.info('Admin verified', { 
      userId: user.id, 
      name: user.name, 
      role: user.role 
    });
    
    const permissions = JSON.parse(user.permissions || '{}');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions,
    };
  } catch (error) {
    authLogger.error('Admin verification error', error);
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

/**
 * Check if admin has specific permission
 */
export function hasPermission(
  permissions: Record<string, boolean>,
  permission: string
): boolean {
  return permissions[permission] === true || permissions['full_reset'] === true;
}

/**
 * Require specific permission - returns error response if not authorized
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<{ authorized: boolean; admin: Awaited<ReturnType<typeof verifyAdmin>> } | NextResponse> {
  const admin = await verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak. Silakan login kembali.' },
      { status: 401 },
    );
  }
  
  if (!hasPermission(admin.permissions, permission)) {
    authLogger.warn('Permission denied', {
      userId: admin.id,
      requiredPermission: permission,
      userPermissions: admin.permissions,
    });
    
    return NextResponse.json(
      { success: false, error: `Anda tidak memiliki izin untuk aksi ini (${permission})` },
      { status: 403 },
    );
  }
  
  return { authorized: true, admin };
}
