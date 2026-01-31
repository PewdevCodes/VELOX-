import express from 'express';
import { match } from 'node:assert';
import { matchesRouter } from './routes/matches.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Sportz Live API');
});

app.use('/matches' , matchesRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

