import { Router } from 'express';
import {
  createMatchSchema,
  listMatchesQuerySchema,
  matchIdParamSchema,
  updateScoreSchema,
} from '../validation/matches.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { start } from 'node:repl';
import { get } from 'node:http';
import { desc, eq } from 'drizzle-orm';

export const matchesRouter = Router();

const MAX_LIMIT = 100;

// Example route to get all matches
matchesRouter.get('/', async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res
      .status(400)
      .json({
        errors: 'Invalid Query Parameters',
        details: JSON.stringify(parsed.error.issues),
      });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .orderBy(desc(matches.createdAt))
      .from(matches)
      .limit(limit);

    res.status(200).json({ matches: data });
  } catch (error) {
    return res
      .status(500)
      .json({ errors: 'Server Error', details: JSON.stringify(error.message) });
  }
});

matchesRouter.post('/', async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      errors: 'Invalid Payload',
      details: JSON.stringify(parsed.error.message),
    });
  }
  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        homeScore: parsed.data.homeScore ?? 0,
        awayScore: parsed.data.awayScore ?? 0,
        status: getMatchStatus(parsed.data.startTime, parsed.data.endTime),
      })
      .returning();

    if (res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(event);
    }

    // Helper to determine match status
    function getMatchStatus(startTime, endTime) {
      const now = new Date();
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (now < start) return 'scheduled';
      if (now >= start && now <= end) return 'live';
      return 'finished';
    }

    return res
      .status(201)
      .json({ message: 'Match created successfully', match: event });
  } catch (error) {
    return res
      .status(500)
      .json({ errors: 'Server Error', details: JSON.stringify(error.message) });
  }
});

// GET /matches/:id - Get a single match by ID
matchesRouter.get('/:id', async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res.status(400).json({
      error: 'Invalid parameters',
      details: paramsResult.error.issues,
    });
  }

  try {
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, paramsResult.data.id))
      .limit(1);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    return res.status(200).json({ match });
  } catch (error) {
    return res.status(500).json({
      error: 'Server Error',
      details: error.message,
    });
  }
});

// PATCH /matches/:id/score - Update match score
matchesRouter.patch('/:id/score', async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);
  const bodyResult = updateScoreSchema.safeParse(req.body);

  if (!paramsResult.success) {
    return res.status(400).json({
      error: 'Invalid parameters',
      details: paramsResult.error.issues,
    });
  }

  if (!bodyResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: bodyResult.error.issues,
    });
  }

  try {
    const [updatedMatch] = await db
      .update(matches)
      .set({
        homeScore: bodyResult.data.homeScore,
        awayScore: bodyResult.data.awayScore,
      })
      .where(eq(matches.id, paramsResult.data.id))
      .returning();

    if (!updatedMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Broadcast score update via WebSocket
    if (res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(updatedMatch);
    }

    return res.status(200).json({
      message: 'Score updated successfully',
      match: updatedMatch,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Server Error',
      details: error.message,
    });
  }
});

// Helper to determine match status
function getMatchStatus(startTime, endTime) {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now < start) return 'scheduled';
  if (now >= start && now <= end) return 'live';
  return 'finished';
}
