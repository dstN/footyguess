# FootyGuess

A progressive-difficulty football player guessing game where you identify
players based on career statistics, transfer history, and biographical clues.

## What This Is

FootyGuess is a single-player web game that tests your knowledge of professional
football players. Each round presents a mystery player from a database of real
career data. You reveal clues incrementally—nationality, position, career stats,
transfer timeline—and submit guesses until you identify the player correctly.

The scoring system rewards speed, accuracy, and using fewer clues. A persistent
streak system tracks consecutive correct guesses across sessions. All game state
is validated server-side with rate limiting and secure headers.

## Quick Start

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 9+

### Installation

```bash
git clone https://github.com/dstN/footyguess.git
cd footyguess
npm install
```

### Development

```bash
npm run dev        # Start at http://localhost:3000
npm test           # Run unit tests
npm run test:e2e   # Run end-to-end tests
```

### Production Build

```bash
npm run build
npm run preview    # Preview production build
```

## Project Structure

```text
footyguess/
├── pages/              # Route definitions (index, play, won)
├── components/         # UI components
├── composables/        # Reactive state management
├── server/
│   ├── api/            # HTTP endpoints
│   ├── services/       # Business logic layer
│   ├── utils/          # Scoring, validation, security
│   ├── db/             # SQLite database
│   └── scraper/        # Data acquisition
├── tests/              # Unit and E2E tests
├── .llm/               # Nuxt 4 / Nuxt UI 4 LLM context
└── ARCHITECTURE.md     # Full technical reference
```

## Tech Stack

- **[Nuxt 4](https://nuxt.com/)** — Full-stack Vue framework (SPA mode)
- **[Nuxt UI 4](https://ui.nuxt.com/)** — Component library
- **[SQLite](https://www.sqlite.org/)** + better-sqlite3 — Embedded database
- **[Valibot](https://valibot.dev/)** — Runtime validation
- **[Vitest](https://vitest.dev/)** / **[Playwright](https://playwright.dev/)** — Testing

## Documentation

| Document                              | Purpose                                |
| ------------------------------------- | -------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)    | System design, conventions, decisions  |
| [PRODUCTION.md](PRODUCTION.md)        | Deployment and operations guide        |
| [IMPROVEMENTS.md](IMPROVEMENTS.md)    | Roadmap and improvement tracking       |
| [CHANGELOG.md](CHANGELOG.md)          | Version history                        |

## Data Population

The game requires player data. Run the data acquisition process manually:

```bash
npm run scrape
```

⚠️ This takes several hours for a full dataset. Data is stored in
`server/db/file/footyguess.db`.

## License

Private project. Not licensed for public use.
