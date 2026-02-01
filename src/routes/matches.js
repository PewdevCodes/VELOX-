import { Router } from 'express';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { start } from 'node:repl';
import { get } from 'node:http';
import { desc } from 'drizzle-orm';

export const matchesRouter = Router();

const MAX_LIMIT = 100;

// Example route to get all matches
matchesRouter.get('/', async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: 'Invalid Query Parameters', details: JSON.stringify(parsed.error.issues) });
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
    return res
      .status(400)
      .json({
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

      if(res.app.locals.broadcastMatchCreated) {
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
