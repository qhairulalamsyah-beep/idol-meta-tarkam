import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

// POST /api/generate-avatar — generate one character avatar
export async function POST(request: NextRequest) {
  try {
    const { slug, prompt } = await request.json();

    if (!slug || !prompt) {
      return NextResponse.json({ error: 'slug and prompt required' }, { status: 400 });
    }

    const outputDir = path.join(process.cwd(), 'public', 'assets', 'characters');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${slug}.png`);

    // Check if already exists
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 5000) {
      await db.character.update({
        where: { slug },
        data: { imageUrl: `/assets/characters/${slug}.png` },
      });
      return NextResponse.json({ success: true, message: 'Already exists', slug });
    }

    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size: '1024x1024',
    });

    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(outputPath, buffer);

    await db.character.update({
      where: { slug },
      data: { imageUrl: `/assets/characters/${slug}.png` },
    });

    return NextResponse.json({
      success: true,
      slug,
      size: buffer.length,
      message: `Generated ${slug}.png`,
    });
  } catch (error: any) {
    console.error('[GENERATE AVATAR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/generate-avatar — list generated avatars
export async function GET() {
  try {
    const outputDir = path.join(process.cwd(), 'public', 'assets', 'characters');
    const files = fs.existsSync(outputDir)
      ? fs.readdirSync(outputDir).filter(f => f.endsWith('.png'))
      : [];

    const maleCount = await db.character.count({ where: { gender: 'male' } });
    const femaleCount = await db.character.count({ where: { gender: 'female' } });

    return NextResponse.json({
      generatedFiles: files.length,
      totalCharacters: maleCount + femaleCount,
      male: maleCount,
      female: femaleCount,
      files,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
