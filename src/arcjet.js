import arcjet, { shield, detectBot, slidingWindow } from '@arcjet/node';

const arcjetKey = process.env.ARCJET_KEY;
const acrjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

if (!arcjetKey) {
  throw new Error('ARCJET_KEY is not defined in environment variables');
}

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: acrjetMode }),
        detectBot({
          mode: acrjetMode,
          allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'],
        }),
        slidingWindow({ mode: acrjetMode, interval: '10s', max: 50 }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: acrjetMode }),
        detectBot({
          mode: acrjetMode,
          allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'],
        }),
        slidingWindow({ mode: acrjetMode, interval: '2s', max: 5 }),
      ],
    })
  : null;

export function securityMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjet) {
      return next();
    }

    try {
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ error: 'Too Many Requests' });
        } else {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    } catch (error) {
      console.error('Arcjet Error:', error);
      return res.status(503).json({ error: 'Internal Server Error' });
    }

    next();
  };
}