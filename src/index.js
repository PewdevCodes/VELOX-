import AgentAPI from 'apminsight';
AgentAPI.config();

import express from 'express';
import http from 'http';
import { match } from 'node:assert';
import { matchesRouter } from './routes/matches.js';
import { commentaryRouter } from './routes/commentary.js';
import {
  attachWebSocketServer,
  broadcastMatchCreated,
  broadcastCommentary,
} from './ws/server.js';
import { securityMiddleware } from './arcjet.js';

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Sportz Live API');
});

app.use(securityMiddleware());

app.use('/matches/:matchId/commentary', commentaryRouter);
app.use('/matches', matchesRouter);

attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(PORT, HOST, () => {
  const baseURL =
    HOST === '0.0.0.0'
      ? `http://localhost:${PORT}`
      : 'http://' + HOST + `:${PORT}`;
  console.log(`Server is running on ${baseURL.replace('http', 'ws')}/ws`);
});
