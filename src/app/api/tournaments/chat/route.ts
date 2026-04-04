import { NextRequest, NextResponse } from 'next/server';

/* ────────────────────────────────────────────
   In-memory chat message store
   ──────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

// Map of tournamentId → ChatMessage[]
const chatStore = new Map<string, ChatMessage[]>();
const MAX_MESSAGES_PER_TOURNAMENT = 100;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/* ────────────────────────────────────────────
   POST /api/tournaments/chat
   Send a new message
   ──────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tournamentId, userId, userName, message } = body;

    if (!tournamentId || !message) {
      return NextResponse.json(
        { error: 'tournamentId and message are required' },
        { status: 400 }
      );
    }

    const trimmed = typeof message === 'string' ? message.trim() : '';
    if (!trimmed) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmed.length > 300) {
      return NextResponse.json(
        { error: 'Message too long (max 300 characters)' },
        { status: 400 }
      );
    }

    const newMessage: ChatMessage = {
      id: generateId(),
      userId: userId || 'anon',
      userName: userName || 'Pengunjung',
      message: trimmed,
      timestamp: new Date().toISOString(),
    };

    // Get or create store for this tournament
    let store = chatStore.get(tournamentId);
    if (!store) {
      store = [];
      chatStore.set(tournamentId, store);
    }

    // Add message and enforce cap
    store.push(newMessage);
    if (store.length > MAX_MESSAGES_PER_TOURNAMENT) {
      store.splice(0, store.length - MAX_MESSAGES_PER_TOURNAMENT);
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

/* ────────────────────────────────────────────
   GET /api/tournaments/chat?tournamentId=xxx
   Fetch messages for a tournament
   ──────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'tournamentId query parameter is required' },
        { status: 400 }
      );
    }

    const store = chatStore.get(tournamentId) || [];
    return NextResponse.json(store);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
