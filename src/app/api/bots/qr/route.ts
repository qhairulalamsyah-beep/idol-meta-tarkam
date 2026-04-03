import { NextResponse } from 'next/server';

const WA_BOT_URL = 'http://localhost:6002';

// GET /api/bots/qr — Check QR code availability from WhatsApp bot
export async function GET() {
  try {
    const statusRes = await fetch(`${WA_BOT_URL}/`, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!statusRes.ok) {
      return NextResponse.json({
        success: false,
        state: 'offline',
        connected: false,
        qrAvailable: false,
        message: 'WhatsApp bot is offline',
      });
    }

    const statusData = await statusRes.json();

    if (statusData.connection?.connected || statusData.connection?.state === 'connected') {
      return NextResponse.json({
        success: true,
        state: 'connected',
        connected: true,
        qrAvailable: false,
        qrUrl: null,
        message: 'WhatsApp sudah terhubung. Tidak perlu scan QR.',
      });
    }

    if (statusData.connection?.qrAvailable) {
      return NextResponse.json({
        success: true,
        state: statusData.connection.state || 'qr',
        connected: false,
        qrAvailable: true,
        qrUrl: '/api/bots/qr/image',
        message: 'Scan QR code dengan WhatsApp → Perangkat Terhubung → Hubungkan Perangkat',
      });
    }

    return NextResponse.json({
      success: true,
      state: statusData.connection?.state || 'connecting',
      connected: false,
      qrAvailable: false,
      qrUrl: null,
      message: statusData.connection?.state === 'connecting'
        ? 'Menghubungkan ke WhatsApp... Mohon tunggu.'
        : 'QR code belum tersedia. Tunggu atau restart bot.',
    });
  } catch {
    return NextResponse.json({
      success: false,
      state: 'offline',
      connected: false,
      qrAvailable: false,
      message: 'Gagal terhubung ke WhatsApp bot',
    });
  }
}
