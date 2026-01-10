# FootyGuess

A progressive-difficulty football player guessing game where you identify
players based on career statistics, transfer history, and biographical clues.

## What This Is

FootyGuess is a single-player web game that tests your knowledge of professional
football players. Each round presents a mystery player from a database of real
career data from public sources. You reveal clues incrementally—nationality,
position, career stats, transfer timeline—and submit guesses until you identify
the player correctly.

The scoring system rewards speed, accuracy, and using fewer clues. A persistent
streak system tracks consecutive correct guesses across sessions. All game state
is validated server-side to prevent tampering, protected by rate limiting and
secure headers.

## Core Concepts

### Game Loop

1. **Start Round**: Server generates a round ID, selects a random player, and
   issues a signed token
2. **Reveal Clues**: Client requests clues one at a time (nationality, height,
   position, career stats, transfer timeline). Each clue costs points.
3. **Submit Guess**: Client sends player name guess + round token to server
4. **Validation**: Server verifies token, checks guess against player name,
   calculates score
5. **Victory or Continue**: Correct guess ends round and updates streak.
   Incorrect guess allows retry with penalty.

### Scoring System

Scores are calculated server-side using:

- **Base Points**: Always 100 points
- **Difficulty Multiplier**: Applied to base points based on player tier (`easy`
  1.0x, `medium` 1.25x, `hard` 1.5x, `ultra` 2.0x). Max score before clues: 100
  (easy), 125 (medium), 150 (hard), 200 (ultra)
- **Clue Penalty**: Each revealed clue subtracts 10 points
- **Time Bonus**: Faster guesses earn bonuses up to +120% (within 1 second).
  Slow guesses (>5 minutes) incur penalties up to -50%.
- **Streak Bonus**: Consecutive correct guesses add up to +30% (at 100+ streak)
- **Malice Penalty**: Incorrect guesses reduce score by 2% each, up to -50%
  total

Formula:
`finalScore = round((basePoints × multiplier - clues × penalty) × (1 + timeBonus) × (1 + streakBonus) × (1 + malicePenalty))`

See [server/utils/scoring.ts](server/utils/scoring.ts) for implementation.

### Player Difficulty Tiers

Difficulty is computed from player career statistics using weighted
international appearances (CL, Europa, national competitions) or top-5 league
apps:

| Tier   | International (weighted) | Top-5 Leagues | Base Points | Multiplier | Max Score |
| ------ | ------------------------ | ------------- | ----------- | ---------- | --------- |
| Easy   | >80 apps                 | >400 apps     | 100         | 1.0x       | 100       |
| Medium | 60-80 apps               | 200-400 apps  | 100         | 1.25x      | 125       |
| Hard   | 45-60 apps               | 100-200 apps  | 100         | 1.5x       | 150       |
| Ultra  | <45 apps                 | <100 apps     | 100         | 2.0x       | 200       |

**Downgrade Rules** (to prevent misleadingly easy ratings):

- Top-5 basis **Easy** → **Medium** if international apps <50
- Top-5 basis **Medium** → **Hard** if international apps <35
- International basis **Easy** → **Medium** if top-5 apps <100
- International basis **Medium** → **Hard** if top-5 apps <50

This ensures players with strong domestic careers but weak
European/international experience (or vice versa) are appropriately challenging.

See [server/utils/difficulty.ts](server/utils/difficulty.ts) for logic.

### Round State & Tokens

Each round is stateful and secured with JWT-like tokens:

- **Round Token**: Signed payload containing `roundId`, `playerId`, `sessionId`,
  `exp` (expiration)
- **Server Validation**: All guess submissions must include valid token. Server
  verifies:
  - Token signature is authentic
  - Round ID matches
  - Round has not expired (30-minute window)
  - Round belongs to the session making the request
- **Clue Tracking**: Server tracks clues used per round. Client cannot fabricate
  lower clue counts.

This prevents score manipulation via client-side tampering.

### Streak System

Streaks persist across browser sessions via localStorage:

- **Increment**: Each correct guess increments `streak` counter
- **Best Streak**: Tracks all-time high
- **Reset**: First incorrect guess after starting a round resets streak to 0
- **Bonus**: Streak multiplier applies to score (5+ streak = +5%, 100+ = +30%)

See [composables/useGameStreak.ts](composables/useGameStreak.ts).

### Clue Pool

Clues are deterministically selected at round start using seeded randomization
(player ID as seed). Available clue types:

- **Biographical**: Age, birthplace, nationality, height, foot preference
- **Career Stats**: Total appearances, goals, assists, minutes per match,
  discipline (cards)
- **Positional**: Main position + secondary positions
- **Contextual**: Most appearances by competition, clean sheets (goalkeepers),
  assists-per-90

The client reveals clues in random order but cannot reveal more than the max
allowed (10 by default). Server enforces this limit.

See [composables/useClueData.ts](composables/useClueData.ts) and See
[composables/useClueData.ts](composables/useClueData.ts) and
[composables/useCluePool.ts](composables/useCluePool.ts).

### Security & Stability

- **Rate Limiting**: All API endpoints are rate-limited to prevent abuse (e.g.,
  30-60 req/min).
- **Security Headers**: HSTS, Content-Security-Policy, and other headers
  enforced via middleware.
- **Health Checks**: `/api/health` endpoint for monitoring database
  connectivity.
- **Error Handling**: Standardized error responses and logging.

## How It Works

### High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT (SPA)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    pages/    │  │ components/  │  │ composables/ │      │
│  │  (routing)   │  │    (UI)      │  │   (state)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                            │                                │
│                      $fetch (REST)                          │
│           (with timeouts & unified logging)                 │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                         SERVER (Nitro)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   server/    │  │   server/    │  │   server/    │      │
│  │    api/      │  │  services/   │  │    utils/    │      │
│  │ (endpoints)  │  │  (business)  │  │  (shared)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                            │                                │
│                     better-sqlite3                          │
│  ┌─────────────────────────┴───────────────────────────┐   │
│  │                    server/db/                        │   │
│  │         SQLite + WAL mode + Auto-Cleanup             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **User Action** (e.g., click "Reveal Clue") triggers composable method
2. **Composable** calls `$fetch('/api/useClue')` with round token
3. **API Route** (`server/api/useClue.ts`) parses input, enforces rate limit,
   verifies token
4. **Service Layer** (`server/services/clue.ts`) updates `clues_used` in
   database
5. **Response** returns success/error via standardized `ApiResponse<T>` format
6. **Composable** updates reactive refs (e.g., `cluesUsed.value++`)
7. **Vue Reactivity** triggers UI re-render

All business logic (scoring, validation, persistence) happens server-side. The
client is a presentation layer.

### Data Flow Boundaries

| Concern        | Handled By         | Notes                                    |
| -------------- | ------------------ | ---------------------------------------- |
| Routing        | `pages/`           | File-based, SPA mode                     |
| UI Rendering   | `components/`      | Nuxt UI 4 primitives                     |
| Client State   | `composables/`     | Reactive refs, orchestration             |
| Business Logic | `server/services/` | **All scoring, validation, persistence** |
| Data Access    | `server/db/`       | Single SQLite connection                 |
| External APIs  | `server/scraper/`  | External data ingestion (with DLQ)       |

See [ARCHITECTURE.md](ARCHITECTURE.md) for full system design.

## Tech Stack

### Core Framework

- **[Nuxt 4](https://nuxt.com/)** — Full-stack Vue framework, running in SPA
  mode (`ssr: false`)
- **[Nuxt UI 4](https://ui.nuxt.com/)** — Component library built on Tailwind
  CSS
- **[Vue 3](https://vuejs.org/)** — Composition API with TypeScript

### Server Runtime

- **[Nitro](https://nitro.unjs.io/)** — Universal server engine (bundled with
  Nuxt)
- **[h3](https://h3.unjs.io/)** — HTTP framework for API routes
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** — Synchronous
  SQLite driver with WAL mode

### Data & Validation

- **[Valibot](https://valibot.dev/)** — Runtime schema validation (request
  parsing, type inference)
- **SQLite** — Embedded database for players, rounds, sessions, transfers, stats
- **[Puppeteer](https://pptr.dev/)** — Headless browser for data acquisition

### Development Tools

- **TypeScript** — Strict mode enabled (`typescript: { strict: true }`)
- **[Vitest](https://vitest.dev/)** — Unit testing framework
- **[Playwright](https://playwright.dev/)** — End-to-end testing
- **[Prettier](https://prettier.io/)** — Code formatting with Tailwind plugin

## Getting Started

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** 9+ or equivalent package manager
- **SQLite3** (bundled with better-sqlite3, no separate install needed)

### Installation

```bash
# Clone repository
git clone https://github.com/dstN/footyguess.git
cd footyguess

# Install dependencies
npm install
```

The `postinstall` script will automatically run `nuxt prepare` to generate type
stubs.

### Database Initialization

The database schema is created automatically on first server start via the
`server/plugins/db-init.ts` plugin. No manual migration step required.

To populate the database with player data, you must run the data acquisition
process (see [Data Population](#data-population) below).

### Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests (requires dev server or preview)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Data Population

The game requires player data to be populated in the database. The data
acquisition process is **not run automatically**. You must trigger it manually:

```bash
npm run scrape
```

**Warning**: The data acquisition process uses Puppeteer to fetch data from
external sources. This process:

- Takes several hours for a full dataset
- May trigger rate limiting if run too aggressively
- Requires stable network connection
- Should be run sparingly (data doesn't change frequently)

Acquired data is stored in the SQLite database at
`server/db/file/footyguess.db`.

See [server/scraper/](server/scraper/) for implementation details.

## Project Structure

```text
footyguess/
├── pages/              # Route definitions (index, play, won)
├── components/         # Reusable UI components (ClueBar, VictoryCard, etc.)
├── composables/        # Reactive state management (usePlayGame, useGameSession, etc.)
├── layouts/            # Page layout wrapper (default.vue)
├── assets/css/         # Global styles and animations
├── utils/              # Client-side pure utilities (scoring-constants, sanitize, client-logger, etc.)
├── types/              # Shared TypeScript types (Player, forms)
├── server/
│   ├── api/            # HTTP endpoints (guess.ts, getPlayer.ts, useClue.ts, etc.)
│   ├── services/       # Business logic layer (player, guess, round, session, etc.)
│   ├── utils/          # Server utilities (scoring, validation, errors, security)
│   ├── db/             # Database connection, schema, and migrations
│   ├── scraper/        # External data acquisition (autonomous-batch-scraper, etc.)
│   ├── middleware/     # Request middleware (security-headers, rate-limit, validation)
│   ├── tasks/          # Nitro scheduled tasks
│   └── plugins/        # Nitro lifecycle hooks (db-init.ts)
├── tests/              # Unit and E2E tests
├── public/             # Static assets (robots.txt)
├── .llm/               # LLM context files (Nuxt 4 / Nuxt UI 4 documentation)
├── nuxt.config.ts      # Nuxt configuration
├── vitest.config.ts    # Vitest configuration
├── playwright.config.ts # Playwright configuration
├── ARCHITECTURE.md     # System design and conventions (read this!)
└── README.md           # This file
```

### Key Files

- [nuxt.config.ts](nuxt.config.ts) — Nuxt configuration (SPA mode, TypeScript
  strict, Vite optimizations)
- [server/db/schema.ts](server/db/schema.ts) — Database schema definitions
- [server/utils/scoring.ts](server/utils/scoring.ts) — Score calculation logic
- [server/utils/difficulty.ts](server/utils/difficulty.ts) — Difficulty tier
  computation
- [composables/usePlayGame.ts](composables/usePlayGame.ts) — Main game
  orchestration composable
- [types/player.ts](types/player.ts) — Player type definitions

## Development Guidelines

### Adding Features Safely

1. **Read [ARCHITECTURE.md](ARCHITECTURE.md)** before making changes. It defines
   normative conventions and anti-patterns.
2. **Follow the 5-step API pattern** for new endpoints:
   - Parse & validate input (Valibot)
   - Rate limiting
   - Authorization (token verification if needed)
   - Business logic (delegate to services)
   - Standardized response
3. **Put business logic in services**, not API routes. API routes are thin
   controllers.
4. **Use composables for client state**, not raw refs scattered across
   components.
5. **Use Nuxt UI components directly**, don't wrap them. Configure defaults in
   `app.config.ts` if needed.
6. **Validate all user input** server-side, even if validated client-side.

### Extending Game Logic

#### Adding a New Clue Type

1. Add clue key to `ClueKey` type in
   [composables/useClueData.ts](composables/useClueData.ts)
2. Implement value extraction logic in `cluePool` computed property
3. Add UI rendering for clue in [components/ClueBar.vue](components/ClueBar.vue)
4. Update tests in [tests/useCluePool.test.ts](tests/useCluePool.test.ts)

#### Modifying Scoring Logic

1. Update formula in [server/utils/scoring.ts](server/utils/scoring.ts)
   (server-side source of truth)
2. Update constants in [utils/scoring-constants.ts](utils/scoring-constants.ts)
   (client-side display)
3. Update [components/HelpModal.vue](components/HelpModal.vue) if scoring rules
   change
4. Update tests in [tests/utils.test.ts](tests/utils.test.ts)

**Critical**: Never modify scoring logic only on the client. The server must
remain authoritative.

#### Changing Difficulty Tiers

1. Modify `computeDifficulty` function in
   [server/utils/difficulty.ts](server/utils/difficulty.ts)
2. Update database queries in
   [server/services/guess.ts](server/services/guess.ts) if data requirements
   change
3. Update UI badges in
   [components/DifficultyBadge.vue](components/DifficultyBadge.vue)
4. Re-scrape players if logic requires new data fields

### Common Pitfalls

1. **Trusting client-provided data** — Always validate server-side. Clients can
   modify any value in memory or network requests.
2. **Skipping rate limiting** — Every public endpoint must have rate limiting to
   prevent abuse.
3. **Using `any` type** — TypeScript strict mode is enabled. Use proper types or
   explicit `unknown` + type guards.
4. **Mutating props** — Vue props are read-only. Emit events or use `v-model`
   for two-way binding.
5. **Storing secrets in code** — Use `.env` files (never committed) for
   sensitive values.
6. **Direct database queries in API routes** — Use service layer functions to
   encapsulate business logic.

See [ARCHITECTURE.md § 9](ARCHITECTURE.md#9-anti-patterns--guardrails) for full
anti-pattern list.

### Testing Strategy

- **Unit Tests**: Services, utilities, composables, scoring logic
- **E2E Tests**: Full game flow (start round → reveal clues → submit guess →
  victory)
- **No Tests For**: UI components (rely on type safety + manual QA), scraper
  (external dependency)

Run tests before committing:

```bash
npm test              # Fast feedback on logic changes
npm run test:e2e      # Full integration validation
```

## Known Limitations & Future Direction

This project has intentional technical debt. See
[ARCHITECTURE.md § 8](ARCHITECTURE.md#8-known-tensions--open-issues) for full
context.

### Accepted Technical Debt

- **Database uses synchronous I/O at import time** (issue #74) — Single-instance
  SQLite is sufficient for expected scale. Asynchronous wrappers add complexity
  without benefit.
- **Scraper files use `any` type extensively** (issue #98) — Typing external
  HTML parsing is low-value. Acquired data is validated before database
  insertion.
- **Database query results use type assertions** (issue #110) — SQLite schema is
  stable. Runtime validation of every query is expensive.

## Further Reading

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Comprehensive system design,
  conventions, and decision rules. Read this before contributing.
- **[.llm/nuxt/llms.txt](.llm/nuxt/llms.txt)** — Nuxt 4 documentation summary
  for LLM tools
- **[.llm/nuxtui/llms.txt](.llm/nuxtui/llms.txt)** — Nuxt UI 4 documentation
  summary for LLM tools

## License

Private project. Not licensed for public use.
