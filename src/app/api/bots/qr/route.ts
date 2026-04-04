import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

// GET /api/bots/qr — Check QR code availability from WhatsApp bot
export async function GET() {
  const config = getConfig();

  // Use Railway URL in production, localhost in development
  const botUrl = config.app.isProduction
    ? config.bot.whatsappUrl
    : 'http://localhost:6002';

  try {
    const statusRes = await fetch(`${botUrl}/api/status`, {
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

    if (statusData.connected || statusData.status === 'connected') {
      return NextResponse.json({
        success: true,
        state: 'connected',
        connected: true,
        qrAvailable: false,
        qrUrl: null,
        message: 'WhatsApp sudah terhubung. Tidak perlu scan QR.',
      });
    }

    if (statusData.hasQR || statusData.status === 'qr_required') {
      return NextResponse.json({
        success: true,
        state: 'qr',
        connected: false,
        qrAvailable: true,
        qrUrl: `${botUrl}/api/qr`,
        message: 'Scan QR code dengan WhatsApp → Perangkat Terhubung → Hubungkan Perangkat',
      });
    }

    return NextResponse.json({
      success: true,
      state: statusData.status || 'connecting',
      connected: false,
      qrAvailable: false,
      qrUrl: null,
      message: statusData.status === 'connecting'
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
