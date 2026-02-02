import { WebSocketServer, WebSocket } from 'ws';

let wss; // moved to module scope

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(wss, payload) {
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

    sendJson(socket, { type: 'welcome' });

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
  broadcast(wss, { type: 'match_created', data: match });
}
