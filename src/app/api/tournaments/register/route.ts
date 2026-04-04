import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { triggerRegistrationUpdate } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

// POST - Register user for tournament
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tournamentId } = body;

    console.log(`[Register] ========== NEW REQUEST ==========`);
    console.log(`[Register] userId: ${userId}`);
    console.log(`[Register] tournamentId: ${tournamentId}`);

    if (!userId || !tournamentId) {
      console.log('[Register] Missing userId or tournamentId');
      return NextResponse.json(
        { success: false, error: 'userId dan tournamentId diperlukan' },
        { status: 400 }
      );
    }

    // Check if already registered
    const existing = await db.registration.findUnique({
      where: {
        userId_tournamentId: { userId, tournamentId },
      },
    });

    console.log(`[Register] Existing registration found:`, existing ? `YES (status: ${existing.status})` : 'NO');

    if (existing) {
      // If rejected, allow re-registration by deleting old record
      if (existing.status === 'rejected') {
        await db.registration.delete({
          where: { id: existing.id },
        });
        console.log(`[Register] Deleted rejected registration, proceeding with new registration`);
      } else if (existing.status === 'pending') {
        console.log(`[Register] RETURN: Registration pending`);
        return NextResponse.json(
          { success: false, error: 'Pendaftaran Anda masih menunggu konfirmasi admin', status: 'pending' },
          { status: 400 }
        );
      } else if (existing.status === 'approved') {
        console.log(`[Register] RETURN: Already approved`);
        return NextResponse.json(
          { success: false, error: 'Anda sudah terdaftar dan dikonfirmasi di turnamen ini', status: 'approved' },
          { status: 400 }
        );
      } else {
        console.log(`[Register] RETURN: Unknown status ${existing.status}`);
        return NextResponse.json(
          { success: false, error: `Anda sudah terdaftar dengan status: ${existing.status}` },
          { status: 400 }
        );
      }
    }

    // Get user info
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log(`[Register] User not found: ${userId}`);
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log(`[Register] User found: ${user.name}`);

    // Create registration
    const registration = await db.registration.create({
      data: {
        id: uuidv4(),
        userId,
        tournamentId,
        status: 'pending',
        tierAssigned: user.tier,
      },
    });

    console.log(`[Register] SUCCESS: Created registration ${registration.id}`);

    triggerRegistrationUpdate(tournamentId, { userId, userName: user.name, status: 'pending', tournamentId }).catch(() => {});

    return NextResponse.json({ success: true, registration });
  } catch (error) {
    console.error('[Register] ERROR:', error);
    return NextResponse.json(
      { success: false, error: `Gagal mendaftar: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// PUT - Approve/Reject registration (admin only)
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { registrationId, status, tierAssigned } = body;

    const updateData: Record<string, string | undefined> = { status };
    if (tierAssigned) updateData.tierAssigned = tierAssigned;

    const registration = await db.registration.update({
      where: { id: registrationId },
      data: updateData,
      include: { user: true },
    });

    // If approved and tier is different, update user's tier
    if (status === 'approved' && tierAssigned && registration.user.tier !== tierAssigned) {
      await db.user.update({
        where: { id: registration.userId },
        data: { tier: tierAssigned },
      });
    }

    triggerRegistrationUpdate(registration.tournamentId, { userId: registration.userId, userName: registration.user.name, status, tournamentId: registration.tournamentId }).catch(() => {});

    return NextResponse.json({ success: true, registration });
  } catch (error) {
    console.error('Error updating registration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update registration' },
      { status: 500 }
    );
  }
}

// DELETE - Remove registration permanently (admin only, for rejected/spam)
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('id');
    const deleteAllRejected = searchParams.get('deleteAllRejected');

    // Delete all rejected registrations for a tournament
    if (deleteAllRejected === 'true') {
      const tournamentId = searchParams.get('tournamentId');
      if (!tournamentId) {
        return NextResponse.json(
          { success: false, error: 'tournamentId required' },
          { status: 400 }
        );
      }

      const result = await db.registration.deleteMany({
        where: {
          tournamentId,
          status: 'rejected',
        },
      });

      return NextResponse.json({
        success: true,
        message: `${result.count} pendaftaran ditolak telah dihapus`,
        count: result.count,
      });
    }

    // Delete single registration
    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: 'Registration ID required' },
        { status: 400 }
      );
    }

    const registration = await db.registration.findUnique({
      where: { id: registrationId },
      include: { user: true },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Pendaftaran tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.registration.delete({
      where: { id: registrationId },
    });

    return NextResponse.json({
      success: true,
      message: `Pendaftaran ${registration.user.name} telah dihapus`,
    });
  } catch (error) {
    console.error('Error deleting registration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete registration' },
      { status: 500 }
    );
  }
}
