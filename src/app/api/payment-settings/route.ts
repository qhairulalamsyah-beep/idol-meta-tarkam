import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/* ═══════════════════════════════════════════════════
   Payment Settings — structured key/value store
   ═══════════════════════════════════════════════════ */

export interface PaymentSettings {
  bankName: string;
  bankCode: string;
  bankNumber: string;
  bankHolder: string;
  gopayNumber: string;
  gopayHolder: string;
  ovoNumber: string;
  ovoHolder: string;
  danaNumber: string;
  danaHolder: string;
  qrisLabel: string;
  qrisImage: string;
  activeMethods: string[];
}

const KEYS: Record<keyof PaymentSettings, string> = {
  bankName: 'payment_bank_name',
  bankCode: 'payment_bank_code',
  bankNumber: 'payment_bank_number',
  bankHolder: 'payment_bank_holder',
  gopayNumber: 'payment_gopay_number',
  gopayHolder: 'payment_gopay_holder',
  ovoNumber: 'payment_ovo_number',
  ovoHolder: 'payment_ovo_holder',
  danaNumber: 'payment_dana_number',
  danaHolder: 'payment_dana_holder',
  qrisLabel: 'payment_qris_label',
  qrisImage: 'payment_qris_image',
  activeMethods: 'payment_active_methods',
};

const DEFAULTS: PaymentSettings = {
  bankName: 'Bank BCA',
  bankCode: 'BCA',
  bankNumber: '1234567890',
  bankHolder: 'IDOL META',
  gopayNumber: '081234567890',
  gopayHolder: 'IDOL META',
  ovoNumber: '081234567890',
  ovoHolder: 'IDOL META',
  danaNumber: '081234567890',
  danaHolder: 'IDOL META',
  qrisLabel: 'IDOL META - QRIS',
  qrisImage: '',
  activeMethods: ['qris', 'bank_transfer', 'ewallet'],
};

async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.settings.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

function buildSettings(map: Record<string, string>): PaymentSettings {
  const s = { ...DEFAULTS };
  for (const [field, key] of Object.entries(KEYS)) {
    if (map[key] !== undefined) {
      const val = map[key];
      if (field === 'activeMethods') {
        try {
          (s as Record<string, unknown>)[field] = JSON.parse(val);
        } catch {
          // keep default
        }
      } else {
        (s as Record<string, unknown>)[field] = val;
      }
    }
  }
  return s;
}

/* ── GET: Return all payment settings ── */
export async function GET() {
  try {
    const map = await getAllSettings();
    const settings = buildSettings(map);

    // Check if any custom settings actually exist (vs all defaults)
    const hasCustom = Object.keys(map).length > 0;

    return NextResponse.json({
      settings,
      hasCustom,
    });
  } catch (error) {
    console.error('[payment-settings] GET error:', error);
    return NextResponse.json(
      { settings: DEFAULTS, hasCustom: false },
      { status: 200 },
    );
  }
}

/* ── PUT: Update payment settings (admin only — no auth middleware required for now) ── */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings: PaymentSettings = body.settings;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'settings object is required' },
        { status: 400 },
      );
    }

    // Upsert each key
    const operations = Object.entries(KEYS).map(([field, key]) => {
      const value = field === 'activeMethods'
        ? JSON.stringify(settings[field as keyof PaymentSettings])
        : String(settings[field as keyof PaymentSettings] ?? DEFAULTS[field as keyof PaymentSettings]);

      return db.settings.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          value,
          description: `Payment setting: ${field}`,
        },
      });
    });

    await Promise.all(operations);

    return NextResponse.json({
      success: true,
      settings: buildSettings(
        Object.fromEntries(
          Object.entries(KEYS).map(([field, key]) => [
            key,
            field === 'activeMethods'
              ? JSON.stringify(settings[field as keyof PaymentSettings])
              : String(settings[field as keyof PaymentSettings] ?? ''),
          ]),
        ),
      ),
    });
  } catch (error) {
    console.error('[payment-settings] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to save payment settings' },
      { status: 500 },
    );
  }
}
