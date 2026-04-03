import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'logos');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB (before compression)

// Python image processor service URL
const IMAGE_PROCESSOR_URL = process.env.IMAGE_PROCESSOR_URL || 'http://localhost:5005';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPG, PNG, WebP, and GIF images are allowed' },
        { status: 400 },
      );
    }

    // Validate file size (before compression)
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be under 5MB' },
        { status: 400 },
      );
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Send to Python image processor service
    const processorFormData = new FormData();
    processorFormData.append('file', file);

    // Use smaller max width for logos (512px) and higher quality (90)
    const processorResponse = await fetch(`${IMAGE_PROCESSOR_URL}/process-and-save?folder=logos&max_width=512&quality=90`, {
      method: 'POST',
      body: processorFormData,
    });

    if (!processorResponse.ok) {
      const error = await processorResponse.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('[LOGO UPLOAD] Processor error:', error);
      
      // Fallback: save original file if processor fails
      console.log('[LOGO UPLOAD] Falling back to original file save...');
      const bytes = await file.arrayBuffer();
      const ext = file.name.split('.').pop() || 'png';
      const uniqueName = `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = path.join(UPLOAD_DIR, uniqueName);
      await writeFile(filePath, Buffer.from(bytes));
      
      return NextResponse.json({
        success: true,
        url: `/uploads/logos/${uniqueName}`,
        filename: uniqueName,
        size: file.size,
        type: file.type,
        fallback: true,
      });
    }

    const result = await processorResponse.json();

    // Copy from processor uploads to public uploads
    const sourcePath = result.filepath;
    const destFilename = result.filename;
    const destPath = path.join(UPLOAD_DIR, destFilename);

    // Read from processor and write to public
    const { copyFile } = await import('node:fs/promises');
    await copyFile(sourcePath, destPath);

    // Return public URL path
    const publicUrl = `/uploads/logos/${destFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: destFilename,
      size: result.processed_size,
      originalSize: result.original_size,
      compressionRatio: result.compression_ratio,
      width: result.width,
      height: result.height,
      type: 'image/webp',
    });
  } catch (error) {
    console.error('[LOGO UPLOAD] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload logo' },
      { status: 500 },
    );
  }
}
