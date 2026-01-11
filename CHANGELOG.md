# Changelog

## [1.2.2] - 2026-01-12

### Architecture & Reliability

This release completes the service layer refactoring and standardizes error handling
across all API routes.

### Fixed

- **Validation Middleware**: Fixed schema mismatches in `requestPlayer` (expected
  `playerName` but endpoint uses `url`) and `sessionStats` (was POST but endpoint
  is GET).
- **Service Exports**: Added missing exports for `player`, `session`, `leaderboard`,
  and `request` services from `services/index.ts`.

### Changed

- **submitScore.ts**: Refactored to use leaderboard service functions instead of
  direct DB queries. Extracted ~170 lines of database logic into reusable service
  functions.
- **Error Handling**: Standardized all API routes to use `AppError` + `handleApiError()`
  pattern, replacing inconsistent `sendError`/`createError` usage.
- **Session Cleanup**: Added periodic session cleanup every 6 hours in production
  (previously only ran at startup).

### Added

- **Leaderboard Service Functions**: Added `getSessionForScoring()`,
  `updateSessionNickname()`, `getLastRoundScore()`, `getPlayerName()`,
  `getExistingEntry()`, `getSessionBestStreak()`, `getSessionTotalScore()`,
  `upsertLeaderboardEntry()`, and `getEntryValue()` to the leaderboard service.

---

## [1.2.1] - 2026-01-10

### Accessibility & Performance

This release addresses critical Lighthouse findings and improves mobile device
efficiency.

### Fixed

- **[Lighthouse] Accessibility**: Added accessible names (`aria-label`) to all
  icon-only buttons (Ko-fi, Modals) improving screen reader support.
- **[Lighthouse] Caching**: Implemented long-term caching headers
  (`max-age=31536000, immutable`) for static assets via `nuxt.config.ts`.
- **Mobile Overheating**: Optimized the background "glitch" animation
  (`default.vue`) to be static on mobile devices, significantly reducing GPU
  usage and heat while preserving the aesthetic.

---

## [1.2.0] - 2026-01-10

### SEO & Meta Optimization

This release adds comprehensive SEO support and fixes UI consistency issues.

### Added

- **SEO Meta Tags**: Full meta description, Open Graph, and Twitter Card support
  in `nuxt.config.ts`.
  - `og:title`, `og:description`, `og:type`, `og:site_name`, `og:locale`,
    `og:url`, `og:image`
  - `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- **Canonical URLs**: Added `rel="canonical"` to all pages (`index`, `play`,
  `won`).
- **robots.txt**: Proper configuration blocking `/api/` and `/_nuxt/` from
  indexing.
- **sitemap.xml**: Static sitemap with all three pages.
- **Favicons**: Full favicon set with `favicon.ico`, `favicon-16x16.png`,
  `favicon-32x32.png`.
- **Apple Touch Icon**: 180x180 icon for iOS home screen.
- **Web Manifest**: `site.webmanifest` with app name, theme color, and Android
  icons.
- **Page-Specific SEO**: Each page now has `useSeoMeta()` with unique title and
  description.

### Fixed

- **Ko-fi Icon**: Changed icon from `i-lucide-heart` to `i-lucide-coffee` on
  `index.vue` and `play.vue` to match `won.vue`.

### Changed

- **Theme Color**: Updated from dark (`#0a0a0a`) to mint primary (`#0ef9ae`).

---

## [1.1.0] - 2026-01-10

### Game Integrity & Polish

This release introduces significant game integrity features to prevent exploits
and improve the user experience for surrendered games.

### Added

- **Feature: Give Up (Surrender)**: Added a button to gracefully exit a round.
  - Surrendering marks the round as a loss (Score 0) and resets the streak.
  - UI correctly displays "You gave up!" with a white flag icon.
- **Refresh Exploit Prevention**: Refreshing the page during an active game now
  reloads the _current_ round instead of skipping to a new player.
- **New Game Reset**: The "New Game" button in the modal now forces a complete
  session reset (new Session ID), preventing state pollution.

### Fixed

- **Messy Win Detection**: Fixed logic to correctly identify wins where
  incorrect guesses were made (negative malice penalty), displaying "Nice save!
  But the wrong guess reset your streak."
- **Surrender Icon**: Fixed an issue where the victory icon (party popper)
  persisted on surrender screens by forcing a distinct flag icon via query
  parameters.
- **Mobile Footer**: Polished the footer on mobile devices to show clean,
  icon-only buttons (`i-lucide-trophy`, `i-lucide-coffee`,
  `i-lucide-help-circle`), preventing text wrapping.
- **Server Error (500)**: Fixed a schema mismatch in the `surrender` API
  endpoint and added missing fields to queries.

## [1.0.0] - 2026-01-10

### Production Readiness & Stability

This release focuses on preparing the application for production by resolving
critical technical debt, enhancing security, and improving code quality.

### Added

- **Service Layer**: Introduced a dedicated service layer to decouple business
  logic from API routes.
  - `server/services/player.ts`: Player retrieval, search, and random selection.
  - `server/services/leaderboard.ts`: Leaderboard queries.
  - `server/services/session.ts`: Session statistics.
  - `server/services/request.ts`: Player request status.
- **Security Enhancements**:
  - **Rate Limiting**: Implemented on all public API endpoints (`getPlayer`,
    `searchPlayers`, etc.) to prevent abuse.
  - **Security Headers**: Added middleware to enforce HSTS, X-Frame-Options,
    X-Content-Type-Options, etc.
  - **Health Check**: New `/api/health` endpoint for monitoring system status
    and DB connectivity.
- **Error Handling**: Standardized `AppError` class and unified error handling
  middleware for consistent API responses.
- **Composables**: Extracted victory screen logic into
  `composables/useWonState.ts` for better separation of concerns.
- **Accessibility**: Added `prefers-reduced-motion` support in CSS to respect
  user system settings.
- **Developer Experience**:
  - Added `.vscode/extensions.json` and `.vscode/launch.json` for consistent dev
    environment.
  - Type-safe error handling patterns.

### Fixed

- **[#117] Scoring Tests**: Added comprehensive test suite for `scoring.ts`
  covering all multipliers and penalties.
- **[#125] Difficulty Tests**: Added tests for `difficulty.ts` covering tier
  calculation and downgrade logic.
- **[#126] Token Tests**: Added tests for `tokens.ts` verifying signature
  validation and expiration.
- **[#118] Architecture Violation**: Removed direct database access from API
  routes; all data access now goes through services.
- **[#123] Component Logic**: Refactored `won.vue` to move complex state
  management out of the Vue component.
- **[#124] API Standards**: Standardized all API error responses.
- **[#127] TypeScript Strictness**: Eliminated `any` types in application code
  (remaining usages restricted to scraper/tests).
- **[#120] CSS Best Practices**: Documented and justified necessary `!important`
  usage for toast positioning.

### Changed

- **API Routes**: Refactored `getPlayer`, `randomPlayer`, `searchPlayers`,
  `leaderboard`, `sessionStats`, and `requestStatus` to use the new service
  layer.
- **Project Structure**: Updated directory organization to fully advocate for
  the Service-Repository pattern (implemented via `better-sqlite3` and service
  modules).

---

## [0.9.0] - 2026-01-07

### Initial Architecture & Beta

- Initial game implementation with Nuxt 4 and Nuxt UI.
- Core game loop: Guessing, Clues, Scoring.
- Scraper implementation for data acquisition.
- Basic SQLite integration.
