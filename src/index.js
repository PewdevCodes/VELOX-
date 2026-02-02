import express from 'express';
import http from 'http';
import { match } from 'node:assert';
import { matchesRouter } from './routes/matches.js';
import { attachWebSocketServer, broadcastMatchCreated } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Sportz Live API');
});

app.use(securityMiddleware());

app.use('/matches', matchesRouter);

attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseURL =
    HOST === '0.0.0.0'
      ? `http://localhost:${PORT}`
      : 'http://' + HOST + `:${PORT}`;
  console.log(`Server is running on ${baseURL.replace('http', 'ws')}/ws`);
});
