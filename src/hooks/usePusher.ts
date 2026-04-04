'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * usePusher - Client-side Pusher-compatible real-time hook
 *
 * Connects to the local Pusher server via WebSocket through the Caddy gateway.
 * Implements the Pusher protocol (subscribe, events, ping/pong) natively.
 */

// ── Types ───────────────────────────────────────────────────────────────

interface PusherEventMap {
  'match-score': { matchId: string; scoreA: number; scoreB: number; tournamentId: string };
  'match-result': { matchId: string; winnerId: string; tournamentId: string };
  'announcement': { message: string; type: string; tournamentId?: string };
  'new-donation': { amount: number; userName: string; message?: string; tournamentId?: string };
  'prize-pool-update': { totalPrizePool: number };
  'tournament-update': { action: string; tournamentId: string; division?: string };
  'registration-update': { userId: string; userName: string; status: string; tournamentId: string };
  'new-sawer': { amount: number; senderName: string; tournamentId?: string };
}

type EventName = keyof PusherEventMap;
type EventHandler<T extends EventName> = (data: PusherEventMap[T]) => void;

interface UsePusherConfig {
  onMatchScore?: EventHandler<'match-score'>;
  onMatchResult?: EventHandler<'match-result'>;
  onAnnouncement?: EventHandler<'announcement'>;
  onNewDonation?: EventHandler<'new-donation'>;
  onPrizePoolUpdate?: EventHandler<'prize-pool-update'>;
  onTournamentUpdate?: EventHandler<'tournament-update'>;
  onRegistrationUpdate?: EventHandler<'registration-update'>;
  onNewSawer?: EventHandler<'new-sawer'>;
}

interface UsePusherReturn {
  isConnected: boolean;
  joinTournament: (tournamentId: string) => void;
  leaveTournament: () => void;
  // Legacy socket.io compatible names
  sendMatchUpdate: (tournamentId: string, matchId: string, scoreA: number, scoreB: number) => void;
  sendMatchComplete: (tournamentId: string, matchId: string, winnerId: string, mvpId?: string) => void;
  sendAnnouncement: (tournamentId: string, message: string, type: 'info' | 'warning' | 'success') => void;
  sendDonation: (tournamentId: string | undefined, amount: number, userName: string, message?: string) => void;
}

// ── Constants ───────────────────────────────────────────────────────────

const APP_KEY = 'local-dev-key';
const PUSHER_PORT = '6001';
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 120000; // 2 minutes

// ── Hook ────────────────────────────────────────────────────────────────

export function usePusher(config: UsePusherConfig = {}): UsePusherReturn {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef(config);
  const currentTournamentRef = useRef<string | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const connectFnRef = useRef<() => void>(() => {});

  // Keep config ref up to date without triggering reconnect
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // ── Build WebSocket URL through Caddy gateway ──
  const buildWsUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/app/${APP_KEY}?protocol=7&client=idol-meta&version=1.0.0&XTransformPort=${PUSHER_PORT}`;
  }, []);

  // ── Send a message (JSON) ──
  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // ── Ping control (stopPing must be declared BEFORE startPing) ──
  const stopPing = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const startPing = useCallback(() => {
    stopPing();
    pingTimerRef.current = setInterval(() => {
      send({ event: 'pusher:ping' });
    }, PING_INTERVAL);
  }, [send, stopPing]);

  // ── Subscribe / Unsubscribe ──
  const subscribe = useCallback((channel: string, channelData?: string) => {
    const data: Record<string, unknown> = { channel };
    if (channelData) data.channel_data = channelData;
    send({ event: 'pusher:subscribe', data: JSON.stringify(data) });
  }, [send]);

  const unsubscribe = useCallback((channel: string) => {
    send({ event: 'pusher:unsubscribe', data: JSON.stringify({ channel }) });
  }, [send]);

  // ── Dispatch incoming event to config handlers ──
  const dispatchEvent = useCallback((event: string, rawData: string) => {
    try {
      const data = JSON.parse(rawData);
      const c = configRef.current;

      switch (event) {
        case 'match-score':
          c.onMatchScore?.(data);
          break;
        case 'match-result':
          c.onMatchResult?.(data);
          break;
        case 'announcement':
          c.onAnnouncement?.(data);
          break;
        case 'new-donation':
          c.onNewDonation?.(data);
          break;
        case 'prize-pool-update':
          c.onPrizePoolUpdate?.(data);
          break;
        case 'tournament-update':
          c.onTournamentUpdate?.(data);
          break;
        case 'registration-update':
          c.onRegistrationUpdate?.(data);
          break;
        case 'new-sawer':
          c.onNewSawer?.(data);
          break;
      }
    } catch (e) {
      console.error('[Pusher] Error dispatching event:', event, e);
    }
  }, []);

  // ── Reconnect with exponential backoff (uses connectFnRef to avoid circular dep) ──
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[Pusher] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current),
      RECONNECT_MAX_DELAY
    );

    reconnectAttemptRef.current++;
    console.log(`[Pusher] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);

    reconnectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      connectFnRef.current();
    }, delay);
  }, []);

  // ── Connect ──
  const connect = useCallback(() => {
    const url = buildWsUrl();
    if (!url) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      if (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('[Pusher] Connected');
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
        startPing();

        // Re-subscribe to current tournament if any
        if (currentTournamentRef.current) {
          subscribe(`private-tournament-${currentTournamentRef.current}`);
          subscribe(`presence-tournament-${currentTournamentRef.current}`,
            JSON.stringify({ user_id: 'demo-user', user_info: '{}' })
          );
        }
        // Subscribe to global channel
        subscribe('global-updates');
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.event === 'pusher:connection_established') {
            // Connection established - handled in onopen
            return;
          }

          if (msg.event === 'pusher:subscription_succeeded') {
            console.log(`[Pusher] Subscribed to: ${msg.channel}`);
            return;
          }

          if (msg.event === 'pusher:pong' || msg.event === 'pusher:ping') {
            return;
          }

          // Dispatch custom events
          if (msg.event && msg.data) {
            dispatchEvent(msg.event, msg.data);
          }
        } catch (_e) {
          // Ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        console.log('[Pusher] Disconnected');
        setIsConnected(false);
        stopPing();
        scheduleReconnect();
      };

      ws.onerror = () => {
        // Error is followed by onclose, so we handle reconnection there
      };
    } catch (e) {
      console.error('[Pusher] Connection error:', e);
      scheduleReconnect();
    }
  }, [buildWsUrl, startPing, stopPing, scheduleReconnect, subscribe, dispatchEvent]);

  // Keep connect function ref updated for scheduleReconnect
  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  // ── Connect on mount ──
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      stopPing();

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      }

      wsRef.current = null;
    };
  }, [connect, stopPing]);

  // ── joinTournament ──
  const joinTournament = useCallback((tournamentId: string) => {
    currentTournamentRef.current = tournamentId;

    // Leave previous tournament channels
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Subscribe to private + presence channels
      subscribe(`private-tournament-${tournamentId}`);
      subscribe(`presence-tournament-${tournamentId}`,
        JSON.stringify({ user_id: 'demo-user', user_info: '{}' })
      );
    }
    // If not connected, onopen will auto-subscribe via currentTournamentRef
  }, [subscribe]);

  // ── leaveTournament ──
  const leaveTournament = useCallback(() => {
    const id = currentTournamentRef.current;
    if (id) {
      unsubscribe(`private-tournament-${id}`);
      unsubscribe(`presence-tournament-${id}`);
    }
    currentTournamentRef.current = null;
  }, [unsubscribe]);

  // ── Legacy socket.io compatible methods ──
  const sendMatchUpdate = useCallback(
    (tournamentId: string, matchId: string, scoreA: number, scoreB: number) => {
      fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, scoreA, scoreB, tournamentId }),
      }).catch(() => {});
    },
    []
  );

  const sendMatchComplete = useCallback(
    (tournamentId: string, matchId: string, winnerId: string, mvpId?: string) => {
      fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, winnerId, mvpId, tournamentId, status: 'completed' }),
      }).catch(() => {});
    },
    []
  );

  const sendAnnouncement = useCallback(
    (tournamentId: string, message: string, type: 'info' | 'warning' | 'success') => {
      fetch('/api/tournaments/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, message, type }),
      }).catch(() => {});
    },
    []
  );

  const sendDonation = useCallback(
    (tournamentId: string | undefined, amount: number, userName: string, message?: string) => {
      fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, message, anonymous: false, tournamentId }),
      }).catch(() => {});
    },
    []
  );

  return {
    isConnected,
    joinTournament,
    leaveTournament,
    sendMatchUpdate,
    sendMatchComplete,
    sendAnnouncement,
    sendDonation,
  };
}
