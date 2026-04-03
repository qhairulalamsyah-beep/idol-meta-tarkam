import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import pusher, { globalChannel } from '@/lib/pusher';

// GET - Get all users or specific user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const gender = searchParams.get('gender');
    const tier = searchParams.get('tier');

    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          rankings: true,
          teamMembers: {
            include: {
              team: {
                include: {
                  tournament: true,
                },
              },
            },
          },
        },
      });
      return NextResponse.json({ success: true, user });
    }

    const where: Record<string, string | boolean> = {};
    if (gender) where.gender = gender;
    if (tier) where.tier = tier;
    // Hide admin users from public player lists
    where.isAdmin = false;

    const users = await db.user.findMany({
      where,
      include: {
        rankings: true,
        club: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
      orderBy: {
        points: 'desc',
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user (registration)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, gender, discordId, avatar, club, whatsappJid } = body;

    // Normalize inputs
    const normalizedName = name.trim().toLowerCase();
    const normalizedPhone = phone ? phone.trim() : null;
    const normalizedJid = whatsappJid ? whatsappJid.trim() : null;

    // PRIORITY 1: Check by WhatsApp JID first (most reliable identifier)
    // This handles the case where same user gets different formats (@s.whatsapp.net vs @lid)
    if (normalizedJid) {
      const existingByJid = await db.user.findFirst({
        where: { whatsappJid: normalizedJid },
      });
      if (existingByJid) {
        console.log(`[API Users] Found existing user by WhatsApp JID: ${normalizedJid} -> user: ${existingByJid.name}`);
        return NextResponse.json(
          { success: true, user: existingByJid, isExisting: true },
          { status: 200 }
        );
      }
    }

    // PRIORITY 2: Check by phone number (fallback for existing data)
    if (normalizedPhone) {
      const existingByPhone = await db.user.findFirst({
        where: { phone: normalizedPhone },
      });
      if (existingByPhone) {
        console.log(`[API Users] Found existing user by phone: ${normalizedPhone} -> user: ${existingByPhone.name}`);
        // Update JID if we have a new one
        if (normalizedJid && !existingByPhone.whatsappJid) {
          const updated = await db.user.update({
            where: { id: existingByPhone.id },
            data: { whatsappJid: normalizedJid },
          });
          return NextResponse.json(
            { success: true, user: updated, isExisting: true },
            { status: 200 }
          );
        }
        return NextResponse.json(
          { success: true, user: existingByPhone, isExisting: true },
          { status: 200 }
        );
      }
    }

    // PRIORITY 3: Check by name in same division
    const existingUsers = await db.user.findMany({
      where: { gender: gender || 'male' },
    });

    let existingByName = existingUsers.find(
      (u) => u.name.trim().toLowerCase() === normalizedName
    );

    if (existingByName) {
      // Same name found - this could be the same person with a new JID/phone
      console.log(`[API Users] Found existing user by name: ${name} -> updating JID/phone`);
      
      // Update JID and phone if we have new ones
      const updateData: Record<string, string | null> = {};
      if (normalizedJid && !existingByName.whatsappJid) {
        updateData.whatsappJid = normalizedJid;
      }
      if (normalizedPhone && !existingByName.phone) {
        updateData.phone = normalizedPhone;
      }
      
      if (Object.keys(updateData).length > 0) {
        const updated = await db.user.update({
          where: { id: existingByName.id },
          data: updateData,
        });
        return NextResponse.json(
          { success: true, user: updated, isExisting: true },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { success: true, user: existingByName, isExisting: true },
        { status: 200 }
      );
    }

    // Resolve club if provided (case-insensitive)
    let clubId: string | null = null;
    if (club && typeof club === 'string' && club.trim().length >= 2) {
      const clubSlug = club.trim().toLowerCase().replace(/\s+/g, '-');
      let clubRecord = await db.club.findUnique({ where: { slug: clubSlug } });
      if (!clubRecord) {
        // Auto-create club with letter avatar (no logo yet)
        clubRecord = await db.club.create({
          data: { name: club.trim(), slug: clubSlug },
        });
      }
      clubId = clubRecord.id;
    }

    // Create user with default B tier
    const user = await db.user.create({
      data: {
        id: uuidv4(),
        name,
        email: phone ? `${phone}@phone.local` : `user-${Date.now()}@local`,
        gender: gender || 'male',
        tier: 'B',
        phone: phone || null,
        whatsappJid: normalizedJid || null,
        discordId,
        avatar: avatar || null,
        points: 0,
        isAdmin: false,
        clubId,
      },
    });

    // Create initial ranking
    await db.ranking.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        points: 0,
        wins: 0,
        losses: 0,
      },
    });

    pusher.trigger(globalChannel, 'user-registered', { userId: user.id, userName: user.name, gender: user.gender }).catch(() => {});

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT - Update user (tier assignment, phone linking, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tier, points, isMVP, name, avatar, phone, club, whatsappJid } = body;

    const updateData: Record<string, string | number | boolean | undefined | null> = {};
    if (tier) updateData.tier = tier;
    if (points !== undefined) updateData.points = points;
    if (isMVP !== undefined) updateData.isMVP = isMVP;
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;
    if (phone) updateData.phone = phone;
    if (whatsappJid) updateData.whatsappJid = whatsappJid;
    if (club !== undefined) {
      if (club === null || club === '') {
        updateData.clubId = null;
      } else {
        const slug = (club as string).trim().toLowerCase().replace(/\s+/g, '-');
        let clubRecord = await db.club.findUnique({ where: { slug } });
        if (!clubRecord) {
          clubRecord = await db.club.create({ data: { name: (club as string).trim(), slug } });
        }
        updateData.clubId = clubRecord.id;
      }
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Update ranking if points changed
    if (points !== undefined) {
      await db.ranking.update({
        where: { userId },
        data: { points },
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
