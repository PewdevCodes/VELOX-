import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';
import {
  matchIdParamSchema,
  listCommentaryQuerySchema,
  createCommentarySchema,
} from '../validation/commentary.js';

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 100;

// GET /:matchId/commentary - Get all commentary for a specific match
commentaryRouter.get('/', async (req, res) => {
  try {
    // Validate params
    const paramsResult = matchIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: paramsResult.error.issues,
      });
    }

    // Validate query
    const queryResult = listCommentaryQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.issues,
      });
    }

    const { matchId } = paramsResult.data;
    const { limit = DEFAULT_LIMIT } = queryResult.data;

    // Apply safety cap
    const safeLimit = Math.min(limit, MAX_LIMIT);

    // Fetch commentary for the match, ordered by createdAt descending
    const commentaryData = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(safeLimit);

    return res.status(200).json({
      message: 'Commentary retrieved successfully',
      count: commentaryData.length,
      data: commentaryData,
    });
  } catch (error) {
    console.error('Error fetching commentary:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

// POST /:matchId/commentary - Create a new commentary entry for a match
commentaryRouter.post('/', async (req, res) => {
  try {
    // Validate params
    const paramsResult = matchIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: paramsResult.error.issues,
      });
    }

    // Validate body
    const bodyResult = createCommentarySchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    const { matchId } = paramsResult.data;
    const commentaryData = bodyResult.data;

    // Insert the commentary entry into the database
    const [newCommentary] = await db
      .insert(commentary)
      .values({
        matchId,
        ...commentaryData,
      })
      .returning();

      if(res.app.locals.broadcastCommentary) {
        res.app.locals.broadcastCommentary(matchId, newCommentary);
      }

    return res.status(201).json({
      message: 'Commentary created successfully',
      data: newCommentary,
    });
  } catch (error) {
    console.error('Error creating commentary:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});
