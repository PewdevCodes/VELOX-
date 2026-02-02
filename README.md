# 🏆 Sportz Live - Real-time Sports Broadcasting

A complete real-time sports broadcasting application with live scores, commentary, and WebSocket updates.

## ✨ Features

- ✅ **Real-time Updates** - WebSocket-powered live match updates
- ✅ **Live Commentary** - Minute-by-minute match commentary
- ✅ **Multiple Sports** - Support for Football, Basketball, Cricket, etc.
- ✅ **Match Management** - Create, update, and track matches
- ✅ **Security** - Rate limiting and bot protection with Arcjet
- ✅ **Modern UI** - Clean, responsive frontend
- ✅ **PostgreSQL** - Powered by Neon serverless Postgres

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:migrate

# Start development server
npm run dev
```

Visit http://localhost:8000 to see your application!

## 📡 Integrating Live Sports Data

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for complete instructions on integrating with sports APIs.

### Recommended APIs:

1. **API-Sports** (https://www.api-sports.io/) - Best for multiple sports
2. **TheSportsDB** (https://www.thesportsdb.com/) - Free alternative
3. **RapidAPI Sports** (https://rapidapi.com/collection/sports-apis) - Multiple providers

## 📚 API Documentation

### Matches

```bash
# Get all matches
GET /matches?limit=50

# Get single match
GET /matches/:id

# Create match
POST /matches
{
  "sport": "Football",
  "homeTeam": "Team A",
  "awayTeam": "Team B",
  "startTime": "2026-02-02T18:00:00.000Z",
  "endTime": "2026-02-02T20:00:00.000Z"
}

# Update score
PATCH /matches/:id/score
{
  "homeScore": 2,
  "awayScore": 1
}
```

### Commentary

```bash
# Get commentary for match
GET /matches/:matchId/commentary?limit=100

# Add commentary
POST /matches/:matchId/commentary
{
  "minute": 45,
  "sequence": 1,
  "eventType": "Goal",
  "actor": "Player Name",
  "team": "Team A",
  "message": "Amazing goal!"
}
```

## 🛠️ Tech Stack

- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Real-time**: WebSocket (ws)
- **Validation**: Zod
- **Security**: Arcjet
- **Frontend**: Vanilla JS, CSS

## 📁 Project Structure

```
Sportz_live/
├── src/
│   ├── db/
│   │   ├── db.js          # Database client
│   │   └── schema.js      # Database schema
│   ├── routes/
│   │   ├── matches.js     # Match routes
│   │   └── commentary.js  # Commentary routes
│   ├── validation/
│   │   ├── matches.js     # Match validation
│   │   └── commentary.js  # Commentary validation
│   ├── ws/
│   │   └── server.js      # WebSocket server
│   ├── arcjet.js          # Security configuration
│   └── index.js           # Main server
├── public/
│   ├── index.html         # Frontend HTML
│   ├── styles.css         # Frontend CSS
│   └── app.js             # Frontend JavaScript
└── .env                   # Environment variables
```

## 🔧 Environment Variables

```env
DATABASE_URL=postgresql://user:password@host/dbname
ARCJET_KEY=your_arcjet_key
ARCJET_MODE=DRY_RUN
PORT=8000
HOST=0.0.0.0
```

## 📦 Available Scripts

```bash
npm run dev          # Start development server with auto-reload
npm start            # Start production server
npm run db:generate  # Generate database migrations
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio (DB GUI)
```

## 🎯 Next Steps

1. **Add Sports API** - Integrate live data (see INTEGRATION_GUIDE.md)
2. **Deploy** - Deploy to Vercel, Railway, or your preferred platform
3. **Enhance UI** - Add more features like user authentication

## 📄 License

MIT License - Free to use for personal and commercial projects

---

Made with ❤️ for sports fans and developers
