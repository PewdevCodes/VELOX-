# Sportz Live - Real-time Sports Broadcasting Application

## 🎯 Project Overview

A complete real-time sports broadcasting application with live match updates and commentary using WebSockets, Express.js, Drizzle ORM, and PostgreSQL (Neon).

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create/update `.env` file:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
ARCJET_KEY="your_arcjet_key"
ARCJET_MODE="DRY_RUN"  # or "LIVE"
PORT=8000
HOST=0.0.0.0
```

### 3. Run Database Migrations

```bash
npm run db:generate
npm run db:migrate
```

### 4. Start the Server

```bash
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:8000
- **API**: http://localhost:8000/matches
- **WebSocket**: ws://localhost:8000/ws

---

## 📡 Sports Data API Integration

To integrate live sports data, you'll need to connect to sports data providers. Here are the best options:

### Option 1: API-Sports (Recommended for Multiple Sports)

**Website**: https://www.api-sports.io/

**Features**:

- Football, Basketball, Hockey, Baseball, etc.
- Live scores and fixtures
- Real-time match events
- Team and player statistics

**Pricing**: Free tier (100 requests/day), Paid plans from $15/month

**Integration Example**:

```javascript
// src/services/api-sports.js
const API_KEY = process.env.API_SPORTS_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

async function fetchLiveMatches() {
  const response = await fetch(`${BASE_URL}/fixtures?live=all`, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  });
  return response.json();
}

async function fetchMatchEvents(fixtureId) {
  const response = await fetch(
    `${BASE_URL}/fixtures/events?fixture=${fixtureId}`,
    {
      headers: {
        'x-apisports-key': API_KEY,
      },
    },
  );
  return response.json();
}
```

### Option 2: TheSportsDB (Free Alternative)

**Website**: https://www.thesportsdb.com/

**Features**:

- Free tier available
- Multiple sports coverage
- Match schedules and results
- Team information

**Pricing**: Free tier (30 requests/minute), Patreon supporters get more

**Integration Example**:

```javascript
// src/services/sportsdb.js
const API_KEY = process.env.SPORTSDB_KEY || '1'; // '1' for free tier
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

async function fetchLiveMatches(sport) {
  const response = await fetch(`${BASE_URL}/${API_KEY}/latestsoccer.php`);
  return response.json();
}

async function fetchTeamNextEvent(teamId) {
  const response = await fetch(
    `${BASE_URL}/${API_KEY}/eventsnext.php?id=${teamId}`,
  );
  return response.json();
}
```

### Option 3: SportRadar (Enterprise)

**Website**: https://sportradar.com/

**Features**:

- Professional-grade data
- Real-time updates
- Comprehensive coverage
- High reliability

**Pricing**: Custom pricing (expensive, for production apps)

### Option 4: RapidAPI Sports Collection

**Website**: https://rapidapi.com/collection/sports-apis

**Features**:

- Multiple providers in one place
- Easy API management
- Free tiers available

**Popular APIs on RapidAPI**:

- API-Football
- LiveScore
- SofaScore
- Flashscore

---

## 🔧 Implementation Guide

### Step 1: Create Data Sync Service

```javascript
// src/services/sports-sync.js
import { db } from '../db/db.js';
import { matches, commentary } from '../db/schema.js';
import { fetchLiveMatches, fetchMatchEvents } from './api-sports.js';

export class SportsSyncService {
  constructor(broadcastMatchCreated, broadcastCommentary) {
    this.broadcastMatchCreated = broadcastMatchCreated;
    this.broadcastCommentary = broadcastCommentary;
  }

  async syncLiveMatches() {
    try {
      const liveMatches = await fetchLiveMatches();

      for (const match of liveMatches.response) {
        const existingMatch = await this.findMatchByExternalId(
          match.fixture.id,
        );

        if (!existingMatch) {
          // Create new match
          const [newMatch] = await db
            .insert(matches)
            .values({
              sport: 'Football',
              homeTeam: match.teams.home.name,
              awayTeam: match.teams.away.name,
              startTime: new Date(match.fixture.date),
              endTime: new Date(
                new Date(match.fixture.date).getTime() + 2 * 60 * 60 * 1000,
              ),
              homeScore: match.goals.home || 0,
              awayScore: match.goals.away || 0,
              status: this.mapStatus(match.fixture.status.short),
            })
            .returning();

          this.broadcastMatchCreated(newMatch);
        } else {
          // Update existing match
          await this.updateMatch(existingMatch.id, {
            homeScore: match.goals.home || 0,
            awayScore: match.goals.away || 0,
            status: this.mapStatus(match.fixture.status.short),
          });
        }
      }
    } catch (error) {
      console.error('Error syncing matches:', error);
    }
  }

  async syncMatchEvents(matchId, externalMatchId) {
    try {
      const events = await fetchMatchEvents(externalMatchId);

      for (const event of events.response) {
        const [newCommentary] = await db
          .insert(commentary)
          .values({
            matchId,
            minute: event.time.elapsed,
            sequence: event.time.elapsed,
            eventType: event.type,
            actor: event.player.name,
            team: event.team.name,
            message: this.formatEventMessage(event),
          })
          .returning();

        this.broadcastCommentary(matchId, newCommentary);
      }
    } catch (error) {
      console.error('Error syncing events:', error);
    }
  }

  mapStatus(apiStatus) {
    const statusMap = {
      NS: 'scheduled', // Not Started
      '1H': 'live', // First Half
      HT: 'live', // Half Time
      '2H': 'live', // Second Half
      ET: 'live', // Extra Time
      P: 'live', // Penalty
      FT: 'finished', // Finished
      AET: 'finished', // Finished After Extra Time
      PEN: 'finished', // Finished After Penalty
    };
    return statusMap[apiStatus] || 'scheduled';
  }

  formatEventMessage(event) {
    switch (event.type) {
      case 'Goal':
        return `⚽ GOAL! ${event.player.name} scores for ${event.team.name}!`;
      case 'Card':
        const cardType = event.detail.includes('Yellow') ? '🟨' : '🟥';
        return `${cardType} ${event.detail} card for ${event.player.name}`;
      case 'subst':
        return `🔄 Substitution: ${event.player.name} replaced by ${event.assist.name}`;
      default:
        return `${event.type}: ${event.player.name}`;
    }
  }

  async findMatchByExternalId(externalId) {
    // You'll need to add an externalId column to your schema
    // For now, this is a placeholder
    return null;
  }

  async updateMatch(matchId, updates) {
    const [updated] = await db
      .update(matches)
      .set(updates)
      .where(eq(matches.id, matchId))
      .returning();

    this.broadcastMatchCreated(updated);
  }
}
```

### Step 2: Add Sync Service to Server

```javascript
// src/index.js additions
import { SportsSyncService } from './services/sports-sync.js';

// After WebSocket setup
const syncService = new SportsSyncService(
  broadcastMatchCreated,
  broadcastCommentary,
);

// Sync every 30 seconds
setInterval(() => {
  syncService.syncLiveMatches();
}, 30000);

// Initial sync
syncService.syncLiveMatches();
```

### Step 3: Add External ID to Schema (Optional but Recommended)

```javascript
// src/db/schema.js - Update matches table
export const matches = pgTable('matches', {
  // ... existing fields
  externalId: text('external_id').unique(),
  externalSource: text('external_source'), // 'api-sports', 'thesportsdb', etc.
});
```

---

## 📋 API Endpoints

### Matches

- `GET /matches` - List all matches
- `GET /matches/:id` - Get single match
- `POST /matches` - Create new match
- `PATCH /matches/:id/score` - Update match score

### Commentary

- `GET /matches/:matchId/commentary` - Get match commentary
- `POST /matches/:matchId/commentary` - Add commentary

### WebSocket Events

- `subscribe` - Subscribe to match updates
- `unsubscribe` - Unsubscribe from match updates
- `match_created` - New match or match update
- `commentary_update` - New commentary entry

---

## 🎨 Frontend Features

- ✅ Real-time match list with live status indicators
- ✅ Live commentary updates via WebSocket
- ✅ Match subscription system
- ✅ Admin panel for testing
- ✅ Responsive design
- ✅ Connection status indicator

---

## 🔒 Security Features

- Arcjet rate limiting and bot protection
- Request validation with Zod schemas
- SQL injection protection via Drizzle ORM
- WebSocket authentication ready

---

## 📦 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Real-time**: WebSocket (ws)
- **Validation**: Zod
- **Security**: Arcjet
- **Frontend**: Vanilla JavaScript, CSS

---

## 🚦 Next Steps

1. **Choose a Sports API** - Sign up for API-Sports or TheSportsDB
2. **Add API Key** - Add to `.env` file
3. **Implement Sync Service** - Use code examples above
4. **Add External ID Column** - Run new migration
5. **Test Integration** - Start syncing live data
6. **Deploy** - Deploy to production (Vercel, Railway, etc.)

---

## 📝 Example Sports API Keys Setup

```env
# Add these to your .env file
API_SPORTS_KEY=your_api_key_here
SPORTSDB_KEY=your_patreon_key_or_1_for_free
```

---

## 🎯 Production Considerations

1. **Rate Limiting**: Respect API rate limits, cache responses
2. **Error Handling**: Implement retry logic for failed API calls
3. **Data Validation**: Validate all incoming API data
4. **Monitoring**: Log API usage and errors
5. **Webhooks**: Use webhooks if available instead of polling
6. **Caching**: Cache team/player data to reduce API calls
7. **Queue System**: Use a job queue (Bull/BullMQ) for background syncing

---

## 🤝 Contributing

Feel free to enhance the application with:

- More sports support
- Advanced statistics
- User authentication
- Favorite teams
- Push notifications
- Mobile app

---

## 📄 License

MIT License - Feel free to use for personal or commercial projects!
