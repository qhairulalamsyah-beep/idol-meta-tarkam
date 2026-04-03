/**
 * IDOL META - Local Pusher-Compatible Server
 *
 * Implements the Pusher protocol for local development:
 * - WebSocket: ws://host:6001/app/{key}?protocol=7&client=...&version=...
 * - HTTP API:  POST http://host:6001/apps/{appId}/events
 *
 * Server-side `pusher` npm package triggers events via HTTP → this server broadcasts to WebSocket clients.
 */

// ── Types ───────────────────────────────────────────────────────────────

interface ClientConnection {
  socketId: string;
  ws: WebSocket;
  channels: Map<string, { subscribedAt: number }>;
  userData?: { id: string; info: string };
}

interface PusherMessage {
  event: string;
  data?: string;
  channel?: string;
}

interface TriggerEvent {
  name: string;
  data: string;
  channels: string[];
}

interface BatchTrigger {
  batch: TriggerEvent[];
}

// ── State ───────────────────────────────────────────────────────────────

const clients = new Map<string, ClientConnection>();
let connectionCounter = 0;

// ── Helpers ─────────────────────────────────────────────────────────────

function generateSocketId(): string {
  connectionCounter++;
  return `${Math.random().toString(36).substring(2, 10)}.${connectionCounter}`;
}

function broadcastToChannel(channel: string, event: string, data: string, excludeSocketId?: string) {
  const payload = JSON.stringify({ event, channel, data });
  let sentCount = 0;

  for (const [id, client] of clients) {
    if (id === excludeSocketId) continue;
    if (client.channels.has(channel) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
      sentCount++;
    }
  }

  return sentCount;
}

function broadcastToChannelWithMemberCount(channel: string, event: string, data: string) {
  let sentCount = 0;
  for (const [, client] of clients) {
    if (client.channels.has(channel) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ event, channel, data }));
      sentCount++;
    }
  }
  return sentCount;
}

function getChannelMemberCount(channel: string): number {
  let count = 0;
  for (const [, client] of clients) {
    if (client.channels.has(channel)) count++;
  }
  return count;
}

function getChannelMembers(channel: string): Record<string, { id: string; info: string }> {
  const members: Record<string, { id: string; info: string }> = {};
  for (const [id, client] of clients) {
    if (client.channels.has(channel) && client.userData) {
      members[id] = { id: client.userData.id, info: client.userData.info };
    }
  }
  return members;
}

function getChannelMemberIds(channel: string): string[] {
  const ids: string[] = [];
  for (const [id, client] of clients) {
    if (client.channels.has(channel)) ids.push(id);
  }
  return ids;
}

// ── HTTP Trigger Handler ────────────────────────────────────────────────

function handleTrigger(body: TriggerEvent | BatchTrigger): Response {
  const events: TriggerEvent[] = 'batch' in body ? body.batch : [body as TriggerEvent];

  for (const evt of events) {
    if (!evt.name || !evt.channels || !Array.isArray(evt.channels)) continue;
    for (const channel of evt.channels) {
      const sent = broadcastToChannel(channel, evt.name, evt.data || '{}');
      console.log(`[PUSHER] Event "${evt.name}" → channel "${channel}" (${sent} clients)`);
    }
  }

  return new Response('{}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── WebSocket Handlers ──────────────────────────────────────────────────

function handleOpen(ws: WebSocket) {
  const socketId = generateSocketId();
  const client: ClientConnection = {
    socketId,
    ws,
    channels: new Map(),
  };

  // Store socketId on ws object for easy access
  (ws as unknown as Record<string, unknown>).__socketId = socketId;
  clients.set(socketId, client);

  // Send connection_established (Pusher protocol requirement)
  ws.send(JSON.stringify({
    event: 'pusher:connection_established',
    data: JSON.stringify({
      socket_id: socketId,
      activity_timeout: 120,
    }),
  }));

  console.log(`[PUSHER] Client connected: ${socketId} (total: ${clients.size})`);
}

function handleMessage(ws: WebSocket, rawMessage: string | Buffer) {
  const client = clients.get((ws as unknown as Record<string, unknown>).__socketId as string);
  if (!client) return;

  try {
    const msg: PusherMessage = JSON.parse(rawMessage.toString());
    const parsedData = msg.data ? JSON.parse(msg.data) : {};

    switch (msg.event) {
      case 'pusher:subscribe': {
        const channel = parsedData.channel;
        if (!channel) break;

        // Extract user data from presence channel_data
        if (channel.startsWith('presence-') && parsedData.channel_data) {
          const channelData = JSON.parse(parsedData.channel_data);
          client.userData = { id: channelData.user_id || client.socketId, info: channelData.user_info || '{}' };
        }

        client.channels.set(channel, { subscribedAt: Date.now() });

        if (channel.startsWith('presence-')) {
          // Presence channel subscription succeeded with member info
          const members = getChannelMembers(channel);
          const memberIds = getChannelMemberIds(channel);
          ws.send(JSON.stringify({
            event: 'pusher:subscription_succeeded',
            channel,
            data: JSON.stringify({
              presence: {
                count: memberIds.length,
                ids: memberIds,
                hash: members,
              },
            }),
          }));

          // Notify other members
          broadcastToChannel(channel, 'pusher:member_added', JSON.stringify({
            socket_id: client.socketId,
            user_id: client.userData?.id || client.socketId,
            user_info: client.userData?.info || '{}',
          }), client.socketId);
        } else {
          // Regular channel subscription succeeded
          ws.send(JSON.stringify({
            event: 'pusher:subscription_succeeded',
            channel,
          }));
        }

        console.log(`[PUSHER] ${client.socketId} subscribed to "${channel}" (${getChannelMemberCount(channel)} total)`);
        break;
      }

      case 'pusher:unsubscribe': {
        const channel = parsedData.channel;
        if (channel && client.channels.has(channel)) {
          client.channels.delete(channel);

          if (channel.startsWith('presence-')) {
            broadcastToChannel(channel, 'pusher:member_removed', JSON.stringify({
              socket_id: client.socketId,
              user_id: client.userData?.id || client.socketId,
            }), client.socketId);
          }

          console.log(`[PUSHER] ${client.socketId} unsubscribed from "${channel}"`);
        }
        break;
      }

      case 'pusher:ping': {
        ws.send(JSON.stringify({ event: 'pusher:pong' }));
        break;
      }

      case 'pusher:get_state': {
        // Used for debugging
        const state = {
          socket_id: client.socketId,
          channels: Array.from(client.channels.keys()),
          total_clients: clients.size,
        };
        ws.send(JSON.stringify({
          event: 'pusher:get_state',
          data: JSON.stringify(state),
        }));
        break;
      }

      default: {
        // Client-triggered event (e.g., client-message)
        // Re-broadcast to the channel (excluding sender)
        if (msg.channel) {
          broadcastToChannel(msg.channel, msg.event, msg.data || '{}', client.socketId);
        }
        break;
      }
    }
  } catch (e) {
    console.error('[PUSHER] Error handling message:', e);
  }
}

function handleClose(ws: WebSocket) {
  const socketId = (ws as unknown as Record<string, unknown>).__socketId as string;
  const client = clients.get(socketId);
  if (!client) return;

  // Notify presence channels about member leaving
  for (const channel of client.channels.keys()) {
    if (channel.startsWith('presence-')) {
      broadcastToChannel(channel, 'pusher:member_removed', JSON.stringify({
        socket_id: socketId,
        user_id: client.userData?.id || socketId,
      }));
    }
  }

  clients.delete(socketId);
  console.log(`[PUSHER] Client disconnected: ${socketId} (total: ${clients.size})`);
}

// ── Server ──────────────────────────────────────────────────────────────

const PORT = 6001;

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    try {
    const url = new URL(req.url);

    // ── WebSocket: /app/{appKey}?... ──
    // (WebSocket upgrades are handled by Bun's websocket handler below)

    // ── HTTP API: POST /apps/{appId}/events ──
    if (req.method === 'POST' && url.pathname.match(/^\/apps\/[^/]+\/events$/)) {
      try {
        const body = await req.json();
        return handleTrigger(body);
      } catch (e) {
        console.error('[PUSHER] Error parsing trigger body:', e);
        return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
      }
    }

    // ── Health check ──
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'idol-meta-pusher',
        connections: clients.size,
        uptime: process.uptime(),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Channel info endpoint (optional, for debugging) ──
    if (req.method === 'GET' && url.pathname.match(/^\/apps\/[^/]+\/channels$/)) {
      const channelInfo: Record<string, { occupied: boolean; subscription_count: number }> = {};
      const allChannels = new Set<string>();
      for (const [, client] of clients) {
        for (const ch of client.channels.keys()) {
          allChannels.add(ch);
        }
      }
      for (const ch of allChannels) {
        channelInfo[ch] = {
          occupied: true,
          subscription_count: getChannelMemberCount(ch),
        };
      }
      return new Response(JSON.stringify({ channels: channelInfo }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('[PUSHER] Unhandled fetch error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
  websocket: {
    open(ws) {
      handleOpen(ws);
    },
    message(ws, message) {
      handleMessage(ws, message);
    },
    close(ws, _code, _reason) {
      handleClose(ws);
    },
    drain(ws) {
      // Backpressure handling - no-op for now
    },
  },
});

console.log(`[PUSHER] 🚀 Local Pusher-compatible server running on port ${PORT}`);
console.log(`[PUSHER] WebSocket: ws://localhost:${PORT}/app/{key}`);
console.log(`[PUSHER] HTTP API:  http://localhost:${PORT}/apps/{appId}/events`);
console.log(`[PUSHER] Health:    http://localhost:${PORT}/health`);
