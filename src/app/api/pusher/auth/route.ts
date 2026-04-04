import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/pusher/auth
 *
 * Authenticates Pusher private/presence channel subscriptions.
 * In local dev, we accept all subscriptions without validation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { socket_id, channel_name } = body;

    if (!socket_id || !channel_name) {
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }

    // Local dev: accept all channel subscriptions
    const auth = `local-dev-key:local-dev-signature-${socket_id}`;

    if (channel_name.startsWith('presence-')) {
      return NextResponse.json({
        auth,
        channel_data: JSON.stringify({ user_id: 'demo-user', user_info: '{}' }),
      });
    }

    return NextResponse.json({ auth });
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json(
      { error: 'Auth failed' },
      { status: 500 }
    );
  }
}
