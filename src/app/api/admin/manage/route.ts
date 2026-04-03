import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

interface Permission {
  tournament?: boolean;
  players?: boolean;
  bracket?: boolean;
  scores?: boolean;
  prize?: boolean;
  donations?: boolean;
  full_reset?: boolean;
  manage_admins?: boolean;
}

const DEFAULT_PERMISSIONS: Permission = {
  tournament: true,
  players: true,
  bracket: true,
  scores: true,
  prize: true,
  donations: true,
  full_reset: false,
  manage_admins: false,
};

// POST - Add new admin (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requesterId, name, pin, permissions: customPermissions } = body;

    console.log('[ADMIN CREATE] Request:', { requesterId, name, hasPin: !!pin, permKeys: customPermissions ? Object.keys(customPermissions) : [] });

    // Verify requester is super_admin
    const requester = await db.user.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak — hanya super admin' }, { status: 403 });
    }

    if (!name || !pin) {
      return NextResponse.json({ success: false, error: 'Nama dan PIN wajib diisi' }, { status: 400 });
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ success: false, error: 'PIN harus 6 digit angka' }, { status: 400 });
    }

    const emailVal = `${name.toLowerCase().replace(/\s+/g, '_')}@idm.id`;

    // Check duplicate name among admins only
    const existingAdmin = await db.user.findFirst({
      where: {
        name,
        role: { in: ['admin', 'super_admin'] }
      }
    });
    if (existingAdmin) {
      return NextResponse.json({ success: false, error: 'Nama admin sudah digunakan' }, { status: 409 });
    }

    const hash = createHash('sha256').update(pin).digest('hex');
    const permissions = JSON.stringify({ ...DEFAULT_PERMISSIONS, ...customPermissions });

    const admin = await db.user.create({
      data: {
        name,
        email: emailVal,
        gender: 'male',
        role: 'admin',
        adminPass: hash,
        permissions,
        isAdmin: true,
        tier: 'S',
      },
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      admin: { ...admin, permissions: JSON.parse(admin.permissions) },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Add admin error:', error);
    if (msg.includes('Unique')) {
      return NextResponse.json({ success: false, error: 'Email sudah terdaftar' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Gagal menambah admin' }, { status: 500 });
  }
}

// PUT - Update admin permissions or PIN (super_admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { requesterId, targetAdminId, permissions: newPermissions, newPin } = body;

    // Verify requester is super_admin
    const requester = await db.user.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak — hanya super admin' }, { status: 403 });
    }

    // Prevent modifying own role (safety)
    if (targetAdminId === requesterId) {
      return NextResponse.json({ success: false, error: 'Tidak bisa mengubah akun sendiri dari sini' }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id: targetAdminId } });
    if (!target || target.role === 'super_admin') {
      return NextResponse.json({ success: false, error: 'Admin tidak ditemukan atau tidak bisa diubah' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (newPermissions) {
      updateData.permissions = JSON.stringify(newPermissions);
    }
    if (newPin) {
      // Validate PIN format (6 digits)
      if (!/^\d{6}$/.test(newPin)) {
        return NextResponse.json({ success: false, error: 'PIN harus 6 digit angka' }, { status: 400 });
      }
      const hash = createHash('sha256').update(newPin).digest('hex');
      updateData.adminPass = hash;
    }

    const updated = await db.user.update({
      where: { id: targetAdminId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, permissions: true },
    });

    return NextResponse.json({
      success: true,
      admin: { ...updated, permissions: JSON.parse(updated.permissions || '{}') },
    });
  } catch (error) {
    console.error('Update admin error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengupdate admin' }, { status: 500 });
  }
}

// DELETE - Remove admin (super_admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('requesterId');
    const targetId = searchParams.get('targetId');

    if (!requesterId || !targetId) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    const requester = await db.user.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak — hanya super admin' }, { status: 403 });
    }

    if (targetId === requesterId) {
      return NextResponse.json({ success: false, error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target || target.role === 'super_admin') {
      return NextResponse.json({ success: false, error: 'Tidak bisa menghapus super admin' }, { status: 400 });
    }

    await db.user.delete({ where: { id: targetId } });

    return NextResponse.json({ success: true, message: `Admin "${target.name}" berhasil dihapus` });
  } catch (error) {
    console.error('Delete admin error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus admin' }, { status: 500 });
  }
}
