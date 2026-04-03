import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Assign a character to a user (during registration)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { characterId, userId } = body;

    if (!characterId || !userId) {
      return NextResponse.json({ error: 'characterId and userId are required' }, { status: 400 });
    }

    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    if (character.isTaken) {
      return NextResponse.json({ error: 'Character already taken', takenBy: character.takenBy }, { status: 409 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.$transaction([
      db.character.update({
        where: { id: characterId },
        data: { isTaken: true, takenBy: userId, takenAt: new Date() },
      }),
      db.user.update({
        where: { id: userId },
        data: {
          character: { connect: { id: characterId } },
          avatar: character.imageUrl,
        },
      }),
    ]);

    return NextResponse.json({ success: true, characterId, userId });
  } catch (error) {
    console.error('Error assigning character:', error);
    return NextResponse.json({ error: 'Failed to assign character' }, { status: 500 });
  }
}

// DELETE - Release a character and clear user's avatar
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
    }

    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character || !character.isTaken) {
      return NextResponse.json({ error: 'Character not found or not taken' }, { status: 404 });
    }

    const operations = [
      db.character.update({
        where: { id: characterId },
        data: { isTaken: false, takenBy: null, takenAt: null },
      }),
    ];

    if (character.takenBy) {
      operations.push(
        db.user.update({
          where: { id: character.takenBy },
          data: {
            character: { disconnect: true },
            avatar: null,
          },
        })
      );
    }

    await db.$transaction(operations);

    return NextResponse.json({ success: true, characterId });
  } catch (error) {
    console.error('Error releasing character:', error);
    return NextResponse.json({ error: 'Failed to release character' }, { status: 500 });
  }
}
