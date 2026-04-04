import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get WhatsApp settings
export async function GET() {
  try {
    const settings = await db.whatsAppSettings.findFirst();

    if (!settings) {
      // Create default settings if not exist
      const newSettings = await db.whatsAppSettings.create({
        data: {
          provider: 'baileys',
          isActive: true,
          metaApiEnabled: false,
          baileysEnabled: true,
          connectionStatus: 'disconnected',
        },
      });
      return NextResponse.json({ success: true, settings: newSettings });
    }

    // Mask sensitive data
    const maskedSettings = {
      ...settings,
      metaAccessToken: settings.metaAccessToken ? `${settings.metaAccessToken.substring(0, 10)}...` : null,
      metaAppSecret: settings.metaAppSecret ? '***hidden***' : null,
      metaWebhookVerifyToken: settings.metaWebhookVerifyToken ? `${settings.metaWebhookVerifyToken.substring(0, 5)}...` : null,
    };

    return NextResponse.json({ success: true, settings: maskedSettings });
  } catch (error) {
    console.error('Failed to get WhatsApp settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// POST - Update WhatsApp settings (called from bot service)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      metaAccessToken,
      metaPhoneNumberId,
      metaBusinessAccountId,
      metaWebhookVerifyToken,
      metaAppSecret,
      metaApiEnabled,
      baileysEnabled,
      provider,
      connectionStatus,
    } = body;

    // Find existing settings or create new
    let settings = await db.whatsAppSettings.findFirst();

    if (!settings) {
      settings = await db.whatsAppSettings.create({
        data: {
          metaAccessToken,
          metaPhoneNumberId,
          metaBusinessAccountId,
          metaWebhookVerifyToken,
          metaAppSecret,
          metaApiEnabled: metaApiEnabled ?? false,
          baileysEnabled: baileysEnabled ?? true,
          provider: provider ?? 'baileys',
          connectionStatus: connectionStatus ?? 'disconnected',
        },
      });
    } else {
      // Update existing settings
      const updateData: Record<string, unknown> = {};

      if (metaAccessToken !== undefined) updateData.metaAccessToken = metaAccessToken;
      if (metaPhoneNumberId !== undefined) updateData.metaPhoneNumberId = metaPhoneNumberId;
      if (metaBusinessAccountId !== undefined) updateData.metaBusinessAccountId = metaBusinessAccountId;
      if (metaWebhookVerifyToken !== undefined) updateData.metaWebhookVerifyToken = metaWebhookVerifyToken;
      if (metaAppSecret !== undefined) updateData.metaAppSecret = metaAppSecret;
      if (metaApiEnabled !== undefined) updateData.metaApiEnabled = metaApiEnabled;
      if (baileysEnabled !== undefined) updateData.baileysEnabled = baileysEnabled;
      if (provider !== undefined) updateData.provider = provider;
      if (connectionStatus !== undefined) updateData.connectionStatus = connectionStatus;

      settings = await db.whatsAppSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Failed to update WhatsApp settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// PUT - Update WhatsApp settings (from admin UI)
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const {
      metaAccessToken,
      metaPhoneNumberId,
      metaBusinessAccountId,
      metaWebhookVerifyToken,
      metaAppSecret,
      metaApiEnabled,
      baileysEnabled,
      provider,
    } = body;

    // Find existing settings
    let settings = await db.whatsAppSettings.findFirst();

    if (!settings) {
      settings = await db.whatsAppSettings.create({
        data: {
          metaAccessToken,
          metaPhoneNumberId,
          metaBusinessAccountId,
          metaWebhookVerifyToken,
          metaAppSecret,
          metaApiEnabled: metaApiEnabled ?? false,
          baileysEnabled: baileysEnabled ?? true,
          provider: provider ?? 'baileys',
          connectionStatus: 'disconnected',
        },
      });
    } else {
      const updateData: Record<string, unknown> = {};

      if (metaAccessToken !== undefined) updateData.metaAccessToken = metaAccessToken;
      if (metaPhoneNumberId !== undefined) updateData.metaPhoneNumberId = metaPhoneNumberId;
      if (metaBusinessAccountId !== undefined) updateData.metaBusinessAccountId = metaBusinessAccountId;
      if (metaWebhookVerifyToken !== undefined) updateData.metaWebhookVerifyToken = metaWebhookVerifyToken;
      if (metaAppSecret !== undefined) updateData.metaAppSecret = metaAppSecret;
      if (metaApiEnabled !== undefined) updateData.metaApiEnabled = metaApiEnabled;
      if (baileysEnabled !== undefined) updateData.baileysEnabled = baileysEnabled;
      if (provider !== undefined) updateData.provider = provider;

      settings = await db.whatsAppSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    // Forward to bot service to update in-memory config
    try {
      await fetch('http://localhost:6002/api/meta/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: metaAccessToken,
          phoneNumberId: metaPhoneNumberId,
          businessAccountId: metaBusinessAccountId,
          webhookVerifyToken: metaWebhookVerifyToken,
          appSecret: metaAppSecret,
          enabled: metaApiEnabled,
        }),
      });
    } catch {
      // Bot service might not be running, that's ok
    }

    // Mask sensitive data in response
    const maskedSettings = {
      ...settings,
      metaAccessToken: settings.metaAccessToken ? `${settings.metaAccessToken.substring(0, 10)}...` : null,
      metaAppSecret: settings.metaAppSecret ? '***hidden***' : null,
      metaWebhookVerifyToken: settings.metaWebhookVerifyToken ? `${settings.metaWebhookVerifyToken.substring(0, 5)}...` : null,
    };

    return NextResponse.json({ success: true, settings: maskedSettings });
  } catch (error) {
    console.error('Failed to update WhatsApp settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
