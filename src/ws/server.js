import { WebSocketServer } from 'ws';

function sendJson(socket, payload) {
  if (socket.readyState === WebSocketServer.OPEN) {
    socket.send(JSON.stringify(payload));
  } else {
    return;
  }
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    } else {
      return;
    }
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 1024 * 1024,
  });

  // Mark socket alive on pong
  function heartbeat() {
    this.isAlive = true;
  }

  wss.on('connection', (socket) => {
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

  return {};
}

function broadcastMatchCreated(match) {
  broadcast(wss, { type: 'match_created', data: match });
}

return { broadcastMatchCreated };
