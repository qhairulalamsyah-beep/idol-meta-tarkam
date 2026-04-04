import { NextResponse } from 'next/server';

// GET /api/bots/qr/image — Proxy QR code PNG image from WhatsApp bot
export async function GET() {
  try {
    const qrRes = await fetch('http://localhost:6002/qr?format=png', {
      signal: AbortSignal.timeout(10000),
    });

    if (!qrRes.ok) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'QR code tidak tersedia' }),
        { status: qrRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const contentType = qrRes.headers.get('content-type') || 'image/png';
    const buffer = await qrRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Gagal mengambil QR code' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
