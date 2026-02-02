import { z } from 'zod';

// List commentary query schema
export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Commentary ID parameter schema
export const commentaryIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Match ID parameter schema for commentary
export const matchIdParamSchema = z.object({
  matchId: z.coerce.number().int().positive(),
});

// Create commentary schema
export const createCommentarySchema = z.object({
  matchId: z.coerce.number().int().positive(),
  minute: z.coerce.number().int().nonnegative().optional(),
  sequence: z.coerce.number().int().positive(),
  period: z.string().optional(),
  eventType: z.string().min(1, 'Event type is required'),
  actor: z.string().min(1, 'Actor is required'),
  team: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

// Update commentary schema
export const updateCommentarySchema = z
  .object({
    minute: z.coerce.number().int().nonnegative().optional(),
    sequence: z.coerce.number().int().positive().optional(),
    period: z.string().optional(),
    eventType: z.string().min(1).optional(),
    actor: z.string().min(1).optional(),
    team: z.string().optional(),
    message: z.string().min(1).optional(),
    metadata: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
