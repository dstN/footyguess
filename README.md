# Footyguess: Transfer Trail

A football guessing game where players decode the mystery of a footballer's career by examining their transfer history. Study the timeline, use strategic clues, and make your guess—all while racing against the clock for bonus points!

## 🎮 Game Overview

**Footyguess: Transfer Trail** is a web-based football riddle where:

- **You see**: A timeline of club transfers with dates, but the player name is hidden
- **You analyze**: Transfer patterns, career length, and club movements
- **You guess**: Type the player's name from a searchable database
- **You score**: Earn points based on difficulty, speed, and streak bonuses

## 🌟 Features

### Core Gameplay
- **Transfer Timeline**: Real transfer history data with club logos and dates
- **Random Clues**: Reveal hints (nationality, position, stats, career achievements) for -10 points each
- **Smart Search**: Autocomplete player search with 1,900+ international football players
- **Difficulty Tiers**: Easy (1×) → Medium (1.25×) → Hard (1.5×) → Ultra (2×) multipliers
- **Streak System**: Build consecutive wins for +5% to +30% score bonuses

### Scoring System
- **Base Points**: 100 pts per round × difficulty multiplier
- **Time Bonus**: 120% bonus for instant guesses, linear drop to 0% at 2 min, -10% penalties after 5 min
- **Streak Bonus**: Up to +30% with 100+ streak
- **Clue Penalty**: -10 pts per clue revealed
- **Minimum Floor**: 10 pts guaranteed per correct guess

### Leaderboards
- **Player-Specific Rounds**: Compete for best score on each footballer
- **Session Total**: Cumulative score across all rounds in a session
- **Best Streak**: Longest consecutive win streak
- **Auto-Update**: Total/streak scores auto-update after initial submission

### Help & Instructions
- **Interactive Tutorial**: Comprehensive "How to Play" guide
- **Scoring Breakdown**: Detailed explanation of multipliers and bonuses
- **Difficulty Popover**: Hover hints on difficulty badges for strategy
- **Pro Tips**: Best practices for maximizing your score

## 🏗️ Tech Stack

### Frontend
- **Nuxt 4** with Vue 3 Composition API
- **TypeScript** for type safety
- **Nuxt UI** (v4.x) for modern components
- **Tailwind CSS** with cyberpunk glassmorphism design
- **Vitest** & **Playwright** for testing

### Backend
- **Nitro** (Nuxt server engine)
- **SQLite** with better-sqlite3 for fast local queries
- **Valibot** for runtime validation
- **Puppeteer** for web scraping TransferMarkt data

### Architecture
- **Server-side API routes** for secure data handling
- **Client-side composables** for game logic
- **Session-based persistence** using localStorage + database
- **Rate limiting** (10 req/min) to prevent abuse

## 📦 Project Structure

```
footyguess/
├── pages/                      # Game pages (index, play, won)
├── components/                 # Vue components
│   ├── HelpModal.vue          # Game instructions modal
│   ├── HighscoreModal.vue     # Leaderboard with player search
│   ├── DifficultyBadge.vue    # Difficulty hover popover
│   ├── TransferTimelineCard.vue
│   ├── TransferTimelineView.vue
│   ├── TransferItem.vue
│   ├── LeaderboardSubmit.vue
│   ├── PlayHeader.vue
│   ├── StreakBar.vue
│   ├── ClueBar.vue
│   ├── GuessFooter.vue
│   ├── ScoreSnapshot.vue
│   ├── VictoryCard.vue
│   ├── ErrorBoundary.vue
│   ├── DevPanel.vue
│   └── ...
├── composables/                # Game logic
│   ├── usePlayGame.ts         # Main game flow
│   ├── useCluePool.ts         # Clue system
│   ├── useClueData.ts         # Clue data management
│   ├── useClueInteraction.ts  # Clue UI interactions
│   ├── useGameSession.ts      # Session management
│   ├── useGameStreak.ts       # Streak tracking
│   ├── useGuessSubmission.ts  # Guess submission logic
│   ├── usePlayerSearch.ts     # Search logic
│   └── useTransferTimeline.ts # Timeline rendering
├── server/
│   ├── api/                    # API endpoints
│   │   ├── submitScore.ts     # Score submission + auto-update
│   │   ├── sessionStats.ts    # Session data
│   │   ├── leaderboard.ts     # Leaderboard queries
│   │   ├── randomPlayer.ts    # Mystery player selection
│   │   ├── guess.ts           # Guess validation
│   │   ├── useClue.ts         # Clue revelation
│   │   ├── getPlayer.ts       # Player details
│   │   ├── searchPlayers.ts   # Player search
│   │   ├── requestPlayer.ts   # Player request queue
│   │   └── requestStatus.ts   # Request status
│   ├── services/              # Business logic
│   │   ├── guess.ts
│   │   ├── clue.ts
│   │   ├── round.ts
│   │   └── index.ts
│   ├── db/
│   │   ├── connection.ts      # SQLite connection
│   │   ├── schema.ts          # Database schema
│   │   ├── insert.ts          # Data insertion utilities
│   │   └── file/
│   ├── scraper/               # TransferMarkt scraper
│   │   ├── scrape-players.ts
│   │   ├── scrape-transfers.ts
│   │   ├── scrape-career.ts
│   │   ├── queue-worker.ts
│   │   ├── index.ts
│   │   └── ...
│   ├── middleware/
│   ├── plugins/
│   │   └── db-init.ts
│   └── utils/
│       ├── scoring.ts         # Score calculations
│       ├── difficulty.ts      # Difficulty detection
│       ├── rate-limit.ts      # Request throttling
│       ├── validate.ts        # Input validation
│       ├── logger.ts          # Logging utilities
│       ├── response.ts
│       ├── tokens.ts
│       └── chunk-array.ts
├── tests/                      # Test suites
│   ├── usePlayGame.test.ts
│   ├── scraper-fixtures.test.ts
│   ├── useCluePool.test.ts
│   ├── usePlayerSearch.test.ts
│   ├── useTransferTimeline.test.ts
│   ├── api-routes.test.ts
│   ├── setup.ts
│   ├── fixtures/
│   │   ├── career-stats.html
│   │   └── transfer-history.html
│   └── utils/
│       ├── db.ts
│       └── h3.ts
├── layouts/
│   └── default.vue            # Main layout with cyberpunk effects
├── assets/
│   └── css/main.css           # Tailwind + animations
├── types/
│   ├── player.ts              # TypeScript interfaces
│   └── forms.ts
├── public/
│   └── robots.txt
├── app.config.ts              # UI theme config
├── nuxt.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── package.json
├── tsconfig.json
├── README.md
├── all_players.json           # Player database seed
├── issues.md
└── TODO.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, pnpm, yarn, or bun

### Installation

```bash
git clone https://github.com/dstN/footyguess.git
cd footyguess
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

### Building for Production

```bash
npm run build
npm run preview
```

## 🗄️ Database

### Database

### Schema Highlights
- **players** (1,900+ records with seed data)
  - Includes TransferMarkt data: position, nationality, market value
  - Indexed for fast name search (name_search, tm_short_name_search, tm_full_name_search)
  - Scraped from Wikidata + TransferMarkt
- **clubs** 
  - Club information with logo paths
- **transfers** (500K+ total records across all players)
  - Complete career transfer history per player
  - Dates, clubs, transfer fees, types (loan, permanent, etc.)
  - Indexed by player_id + transfer_date
- **sessions**
  - User gameplay sessions with streak/score tracking
  - Persistent across page reloads
- **rounds**
  - Individual puzzle games with expiration
  - Links to players and sessions
- **scores**
  - Score records for each round with breakdowns
  - Base score, time score, streak multiplier tracking
- **leaderboard_entries**
  - Three types: `round` (per-player), `total`, `streak`
  - Player-specific round scores with lookup indexes
- **player_stats**
  - Career statistics by competition
  - Used for difficulty calculation
- **competitions**
  - Competition reference table (Champions League, Premier League, etc.)
- **requested_players**
  - Queue of players requested by users
- **scrape_jobs**
  - Background job queue for data updates

### Key Queries
- Player search: O(1) with name_search index
- Recent transfers: O(1) with player_id + date index
- Leaderboard fetch: O(log n) with type + value index

## 🎯 Game Flow

1. **Load Mystery**: Random player selected, transfers shown
2. **Study Timeline**: Examine clubs and dates (name hidden)
3. **Strategic Clues**: Optional hints cost points
4. **Search & Guess**: Type player name, select from autocomplete
5. **Submit**: Correct = score calculation + streak update
6. **Leaderboard**: Submit to permanent leaderboard for bragging rights

## 📊 Scoring Deep Dive

### Example Calculation
Player: Cristiano Ronaldo (Ultra difficulty)
- Base: 100 pts
- Difficulty: 100 × 2.0 = 200 pts
- Clues: 200 - (2 clues × 10) = 180 pts
- Speed: Guessed in 45s → 0% bonus = 180 pts (no time bonus)
- Streak: 15+ → 180 × 1.10 = **198 pts final**

### Time Bonus Breakdown
- **≤1 second**: +120% bonus (instant guess reward)
- **1s → 2 minutes**: Linear drop from +120% to 0% (penalty-free zone)
- **2min → 5min**: No bonus, no penalty (safe zone)
- **>5 minutes**: -10% per 30s penalty starting immediately (max -50%)

### Difficulty Multipliers
Based on player fame (international + league appearances). **More experience = easier!**

**By International Competitions (weighted)**:
- **Easy**: >80 weighted apps = 1.0× (100 pts max)
- **Medium**: 60-80 weighted apps = 1.25× (125 pts max)
- **Hard**: 45-60 weighted apps = 1.5× (150 pts max)
- **Ultra**: <45 weighted apps = 2.0× (200 pts max) — Obscure players!

**By Top 5 Leagues**:
- **Easy**: >400 apps = 1.0× (famous league players)
- **Medium**: 200-400 apps = 1.25×
- **Hard**: 100-200 apps = 1.5×
- **Ultra**: <100 apps = 2.0× (lesser-known league players)

### Streak Bonuses
- 5+ streak: +5% multiplier
- 15+ streak: +10% multiplier
- 30+ streak: +15% multiplier
- 60+ streak: +20% multiplier
- 100+ streak: +30% multiplier

## 🌐 API Endpoints

### Game Flow
- `GET /api/randomPlayer` - Get new mystery player with transfers
- `POST /api/guess` - Validate guess and calculate score
- `POST /api/useClue` - Reveal clue and deduct points
- `GET /api/getPlayer` - Get full player details + stats

### Scoring & Leaderboard
- `POST /api/submitScore` - Submit score to leaderboard (supports auto-update)
- `GET /api/sessionStats` - User's current session stats (streak, total, lastPlayerId, submittedTypes)
- `GET /api/leaderboard` - Top scores by type/player with optional player search

### Search & Management
- `GET /api/searchPlayers` - Find players by name (for leaderboard search)
- `POST /api/requestPlayer` - Request player data scrape (adds to queue)
- `GET /api/requestStatus` - Check status of player scrape requests

## 🔧 Configuration

### Theme (app.config.ts)
```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'mint',      // Primary accent (cyan)
      secondary: 'mew',     // Secondary accent (pink)
    },
    // Custom glassmorphism styling
    modal: {
      content: 'bg-white/5 backdrop-blur-xs ...',
    },
    popover: {
      content: 'bg-slate-950/80 backdrop-blur-md ...',
    },
  },
});
```

### Difficulty Thresholds (server/utils/difficulty.ts)
The system uses two basis calculations:
- **International**: Weighted appearances in Champions League, Europa League, national team, etc.
- **Top 5**: Raw appearances in Premier League, La Liga, Serie A, Ligue 1, Bundesliga

Priority: International tier is preferred unless it's Ultra, then Top 5 is used. The higher the appearances, the easier the tier.

### Rate Limiting (server/utils/rate-limit.ts)
- Score submission: 10 requests per minute per session
- Search: Standard rate limits

## 📱 Responsive Design

- **Mobile-first** approach with Tailwind CSS
- **Cyberpunk glassmorphism** aesthetic with:
  - Frosted glass cards (white/5 with backdrop-blur)
  - Gradient borders and glowing accents
  - Animated background grid and glitch effects
- **Touch-optimized** buttons and inputs
- **Dark mode** by default with mint & pink accents

## 🐛 Known Issues & TODOs

See [issues.md](issues.md) and [TODO.md](TODO.md) for:
- Current bugs and edge cases
- Planned features and improvements
- Performance optimization ideas
- Data quality concerns

## 📈 Performance

- **Database**: SQLite with strategic indexes (~50ms avg query)
- **Bundle**: ~280KB gzipped (optimized)
- **LCP**: <2.5s typical
- **API Response**: <200ms avg
- **Time Bonus Calculation**: O(1) linear interpolation

## 🔐 Security

- Input validation with Valibot runtime schemas
- Rate limiting on score submission (10 req/min)
- Session-based score tracking (no cross-session manipulation)
- No external API exposures
- CSRF protection with httpOnly sessions

## 🤝 Contributing

1. Clone the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'feat: description'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Development Guidelines
- Write tests for new features
- Follow TypeScript strict mode
- Use Prettier for code formatting
- Update README/docs for new features

## 📝 License

MIT License - Feel free to use and modify.

## 🙏 Credits

- **Data**: TransferMarkt (via Puppeteer scraper)
- **UI Library**: Nuxt UI v4 + Tailwind CSS
- **Icons**: Lucide React
- **Framework**: Nuxt 4 & Vue 3 Composition API
- **Styling**: Cyberpunk glassmorphism design system

## 📧 Contact & Support

Questions or feedback? 
- Open an issue on GitHub
- Check [issues.md](issues.md) for known problems
- Review [TODO.md](TODO.md) for planned features

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: Active Development
