import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CHARACTER_DEFINITIONS } from '@/lib/characterGenerator';

// GET - List characters with optional filtering by gender, universe, alignment
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get('gender');
    const universe = searchParams.get('universe');
    const alignment = searchParams.get('alignment');

    const where: Record<string, unknown> = {};

    if (gender) {
      where.gender = gender;
    }
    if (universe) {
      where.universe = universe;
    }
    if (alignment) {
      where.alignment = alignment;
    }

    const characters = await db.character.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { classType: 'asc' },
    });

    return NextResponse.json({ characters, total: characters.length });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}

// POST - Delete all existing characters and seed 60 from CHARACTER_DEFINITIONS
export async function POST() {
  try {
    // Delete all existing characters (cascades user relation via disconnect)
    await db.character.deleteMany({});

    // Count genders for avatar index assignment
    const maleChars = CHARACTER_DEFINITIONS.filter(c => c.gender === 'male');
    const femaleChars = CHARACTER_DEFINITIONS.filter(c => c.gender === 'female');
    const maleIdxMap = new Map<string, number>();
    const femaleIdxMap = new Map<string, number>();
    maleChars.forEach((c, i) => maleIdxMap.set(c.slug, i));
    femaleChars.forEach((c, i) => femaleIdxMap.set(c.slug, i));

    const createData = CHARACTER_DEFINITIONS.map((char) => {
      const isMale = char.gender === 'male';
      const idxMap = isMale ? maleIdxMap : femaleIdxMap;
      const idx = idxMap.get(char.slug) ?? 0;
      const avatarCount = isMale ? maleChars.length : femaleChars.length;
      const avatarIdx = (idx % avatarCount) + 1;
      return {
        name: char.name,
        slug: char.slug,
        gender: char.gender,
        universe: char.universe,
        alignment: char.alignment,
        classType: char.classType,
        colors: JSON.stringify(char.colors),
        imageUrl: `/assets/avatars/${isMale ? 'male' : 'female'}-${avatarIdx}.webp`,
        isTaken: false,
      };
    });

    const result = await db.character.createMany({ data: createData });

    return NextResponse.json({
      success: true,
      message: `Deleted all characters and seeded ${result.count} new ones`,
      total: result.count,
    });
  } catch (error) {
    console.error('Error seeding characters:', error);
    return NextResponse.json({ error: 'Failed to seed characters' }, { status: 500 });
  }
}
