# Changelog

## [1.4.2] - 2026-01-15

### Complete Scoring Formula Overhaul

This release rewrites the scoring formula to be **all-additive** — every
bonus/penalty is a percentage of base × multiplier. **5 uses of any penalty =
-30%** to guarantee minimum 10% score (10 pts on Easy, 40 pts on Ultra).

### Changed

- **Scoring Formula**: New all-additive system:
  - Base × multiplier = adjustedBase
  - **+ Streak bonus**: +5% to +30%
  - **+ No clues bonus**: +10% if 0 clues used
  - **− Clue penalty**: -6% per clue (max 5 = -30%)
  - **+ No wrong guesses bonus**: +10% if 0 wrong guesses
  - **− Wrong guess penalty**: -6% per wrong guess (max 5 = -30%)
  - **± Time bonus**: +120% instant → 0% at 2min → -0.1% per sec after 5min (max
    -30% at 10min)
- **Minimum score**: 10% of base (e.g., 10 pts on Easy, 40 pts on Ultra)
- **Time freeze**: Grace period of 5s per player transfer (capped at 30s)
- **Perfect play reward**: 0 clues + 0 wrong guesses = +20% bonus
- **Live score display**: Real-time potential score counter in
  TransferTimelineCard

### Fixed

- **Toast notification**: Fixed "undefined base pts" and "NaN%" display.
- **ScoreSnapshot**: Correctly shows penalties vs bonuses.
- **Unicode Search**: Diacritics in player names are normalized.

### Technical Notes

- Penalties capped at 30%: `clueRawPenalty`, `maliceRawPenalty`, `timeBonus`.
- Tests updated for new linear time penalty.

---

## [1.4.1] - 2026-01-13

### Bug Fixes & Improvements

#### Fixed

- **Streak Reset in Default Mode**: Streaks no longer reset when random
  difficulty changes within "default" mode. Now correctly tracks user-selected
  mode instead of actual tier.
- **Leaderboard Stale Values**: Streak and Total leaderboards now read live
  values from sessions table, fixing display discrepancies.
- **Rate Limiting in Fast Play**: Increased `submitScore` rate limit from 10/min
  to 30/min to allow fast gameplay.

#### Added

- **No Duplicate Players**: Players no longer repeat within the same session.
- **Rate Limit Debugging**: Error messages now include the rate limit key (e.g.,
  `Too many requests (submitScore)`).

#### Changed

- **Removed streak column usage**: The redundant `streak` column in
  `leaderboard_entries` is no longer written to.
- **Removed redundant toast**: The "streak reset" toast in `loadPlayer()` was
  removed as the confirmation modal already handles this.

---

## [1.4.0] - 2026-01-13

### Loss Mechanics & Difficulty Persistence

- **Difficulty Lost on "New Mystery"**: User-selected difficulty now persists
  across rounds. The choice is stored in localStorage and re-applied when
  starting new games via "New mystery" button on victory/loss screen.
- **Give-Up Blocked After All Clues**: The "Give Up" button was incorrectly
  disabled when all clues were revealed. Now only disabled during API loading.
- **Wrong Guess Penalty Rework**: Changed from -2% per wrong guess to a more
  impactful system:
  - Each wrong guess applies **-10%** penalty (was -2%)
  - Maximum **5 wrong guesses** allowed (-50% max penalty)
  - **6th wrong guess = instant loss** (aborted, score 0, streak reset)

### Added

- **MAX_WRONG_GUESSES Constant**: New constant `MAX_WRONG_GUESSES = 5` exported
  from `utils/scoring-constants.ts` for consistent client/server usage.
- **Abort API Response**: `/api/guess` now returns `aborted`, `abortReason`, and
  `wrongGuessCount` fields when a round is aborted due to too many wrong
  guesses.
- **Distinct Loss States**: The `/won` page now handles three distinct outcomes:
  - **Win** (`?reason=win`): Green checkmark, points displayed
  - **Surrender** (`?reason=surrender`): White flag icon, "You gave up"
  - **Aborted** (`?reason=aborted`): Red X icon, "Game Over - Too many guesses"
- **onAborted Callback**: New callback in `useGuessSubmission` for handling
  abort scenarios.

### Changed

- **PlayHeader.vue**: Give-up button disabled state now uses `isLoading` prop
  instead of `tipButtonDisabled`.
- **VictoryCard.vue**: "New mystery" button now reads difficulty from
  localStorage and navigates with query parameter.
- **won.vue**: Complete rewrite with outcome-specific titles, subtitles, icons,
  and SEO meta tags.
- **HelpModal.vue**: Updated "Malice Penalty" section to "Wrong Guess Penalty"
  with MAX_WRONG_GUESSES import and abort warning.
- **index.vue**: Updated scoring row to show "Max 5 (-10% each), 6th = loss".

### Technical Notes

- Difficulty is stored in localStorage under key `footyguess_difficulty`.
- The `wrongGuessCount` is tracked server-side per round and returned in guess
  API responses.
- Abort logic is handled in `server/services/guess.ts` before normal guess
  processing.

---

## [1.3.0] - 2026-01-12

### Difficulty Selection System

This release introduces user-selectable difficulty and significantly revised
scoring multipliers for more meaningful score differentiation.

### Added

- **Difficulty Selector Modal**: New `DifficultySelector.vue` component shown
  before starting a game (from index.vue "Play Game") or loading a new player
  (from play.vue "New Game").
- **Difficulty Options**: Default (random Easy/Medium/Hard), Easy (1×), Medium
  (2×), Hard (3×), Ultra (4×).
- **UserSelectedDifficulty Type**: New type union for user-facing difficulty
  options: `'default' | 'easy' | 'medium' | 'hard' | 'ultra'`.
- **GameMode Type**: Scaffold type for future game mode extensibility (currently
  only `'classic'`).
- **API Difficulty Parameter**: `/api/randomPlayer` now accepts `?difficulty=X`
  query parameter to filter players by tier.

### Changed

- **Scoring Multipliers**: Revised from (1×, 1.25×, 1.5×, 2×) to (1×, 2×, 3×,
  4×) for more impactful difficulty rewards.
- **Maximum Points**: Updated max points per tier to 100/200/300/400 (was
  100/125/150/200).
- **useGameSession**: Now accepts difficulty option when loading players.
- **usePlayerReset**: Confirm function now accepts optional difficulty
  parameter.
- **Player Service**: `getRandomPlayer()` refactored to accept `tierFilter`
  option instead of boolean `hardMode`.
- **PlayHeader**: Two-step flow for "New Game" — confirm streak reset, then
  select difficulty.

### Technical Notes

- Backwards compatible: Legacy `?mode=hard` still works (maps to `ultra`).
- "Default" difficulty randomly selects from Easy/Medium/Hard (excludes Ultra).
- DifficultySelector exposes `open()`/`close()` methods for programmatic
  control.

---

## [1.2.2] - 2026-01-12

### Architecture & Reliability

This release completes the service layer refactoring and standardizes error
handling across all API routes.

### Fixed

- **Validation Middleware**: Fixed schema mismatches in `requestPlayer`
  (expected `playerName` but endpoint uses `url`) and `sessionStats` (was POST
  but endpoint is GET).
- **Service Exports**: Added missing exports for `player`, `session`,
  `leaderboard`, and `request` services from `services/index.ts`.

### Changed

- **submitScore.ts**: Refactored to use leaderboard service functions instead of
  direct DB queries. Extracted ~170 lines of database logic into reusable
  service functions.
- **Error Handling**: Standardized all API routes to use `AppError` +
  `handleApiError()` pattern, replacing inconsistent `sendError`/`createError`
  usage.
- **Session Cleanup**: Added periodic session cleanup every 6 hours in
  production (previously only ran at startup).

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
