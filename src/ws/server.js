import { WebSocketServer, WebSocket } from 'ws';
import { wsArcjet } from '../arcjet.js';

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  if (matchSubscribers.has(matchId)) {
    matchSubscribers.get(matchId).delete(socket);
  }
}

function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

function broadcastToMatch(matchId, payload) {
  if (!matchSubscribers.has(matchId)) return;
  for (const socket of matchSubscribers.get(matchId)) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }
}

function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch {
    sendJson(socket, { type: 'error', message: 'Invalid message format' });
    return;
  }

  if (message.type === 'subscribe' && message.matchId) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: 'subscribed', matchId: message.matchId });
  }

  if (message.type === 'unsubscribe' && message.matchId) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: 'unsubscribed', matchId: message.matchId });
  }
}

let wss; // moved to module scope

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcastToAll(payload) {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  }
}

export function attachWebSocketServer(server) {
  wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 1024 * 1024,
  });

  // Mark socket alive on pong
  function heartbeat() {
    this.isAlive = true;
  }

  wss.on('connection', async (socket, request) => {
    if (!wsArcjet) {
      try {
        const decision = await wsArcjet.protect(request);

        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            socket.close(1008, 'Too Many Requests');
          } else {
            socket.close(1008, 'Forbidden');
          }
        }
      } catch (error) {
        console.error('Arcjet WS Error:', error);
        socket.close(1011, 'Internal Server Error');
      }
    }

    socket.isAlive = true;

    socket.on('pong', heartbeat);

    socket.subscriptions = new Set();

    sendJson(socket, { type: 'welcome' });

    socket.on('message', (data) => handleMessage(socket, data));

    socket.on('close', () => cleanupSubscriptions(socket));

    socket.on('error', console.error);
  });

  // Ping every 30s, kill dead clients
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        console.log('Terminating dead client');
        return socket.terminate();
      }

      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

// exported instead of illegal return
export function broadcastMatchCreated(match) {
  if (!wss) return;
  broadcastToAll({ type: 'match_created', data: match });
}

export function broadcastCommentary(matchId, commentary) {
  if (!wss) return;
  broadcastToMatch(matchId, { type: 'commentary_update', data: commentary });
}
