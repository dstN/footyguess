<!-- markdownlint-disable MD024 -->

# Changelog

## [1.6.6] - 2026-11-23

### Documentation

- README, ARCHITECTURE, IMPROVEMENTS, PRODUCTION and this changelog use plain
  wording: status emojis are text, bold labels and dashes between clauses are
  gone, and so are phrases like "massively" or "transforms". Versions, dates
  and code blocks are unchanged.

### Fixed

- Three tables in ARCHITECTURE.md (Deferred Concerns, Quick Reference and the
  document changelog) had rows with more columns than their header, so GitHub
  rendered them wrongly.

## [1.6.5] - 2026-01-23

### Maintenance & Operations

- Maintenance Mode: Added an "Under Construction" / maintenance screen (enabled
  by default in `App.vue`) to take the site offline during updates or server
  work.
- Database Operations: Added `scripts/checkpoint-local-db.ts` for database
  exports. It forces a WAL checkpoint on a local copy of the database, which
  merges the data from the `.wal` file into the main `.db` file so the copy can
  be used or moved on its own.

---

## [1.6.4] - 2026-01-19

### Legal & Privacy

Added `/legal` page with Imprint and Privacy Policy in a responsive 3-column
layout.

- Imprint: German legal information (§ 5 DDG) with spam-protected email
- Privacy Policy: 6 sections covering data controller, hosting, localStorage,
  database, right to erasure, and external links
- Footer Links: New persistent footer with "LEGAL" and "MY DATA" links plus
  version display, visible on all pages via layouts
- Layout: New `thin-extended` layout for wider content pages

### Bug Fixes

- Badword Filter Feedback: Submitting an inappropriate nickname showed a success
  toast. The API now sets the HTTP status code, so the frontend shows an error.
- Play Page Padding: Conditional bottom padding for `/play` route (needs more
  space for guess bar)

---

## [1.6.3] - 2026-01-19

### Self-Service Session Deletion

Added user-facing `/delete` page for session data removal.

- Delete Page: On the new `/delete` route users delete their own session data by
  entering their session ID
- Full Cleanup: Removes all associated data (scores, rounds, leaderboard
  entries, session) in a single transaction
- Self-Detection: Pre-fills the current session ID and warns users when they are
  about to delete their own session
- Local Data Cleanup: Clears all localStorage data when deleting own session
  (streak, difficulty, etc.)
- Toast Feedback: Success and error messages appear as toasts
- SEO: Search engines may index the delete page (`/reset` stays non-indexed)

---

## [1.6.2] - 2026-01-18

### Nickname Moderation

Added a server-side profanity filter for leaderboard names.

- Nickname Filter: Uses `bad-words-next` package with 9 language dictionaries
  (EN, ES, FR, DE, RU, UA, PL, CH + Russian Latin)
- Leetspeak Detection: Catches obfuscated profanity like `f*ck`, `sh1t`
- Unicode Confusables: Blocks homoglyph attacks like `fμck`
- Feedback: Users see "Nickname contains inappropriate content" instead of a
  generic error

---

## [1.6.1] - 2026-01-18

### Difficulty Tier Refinements

Difficulty classification now uses stricter AND-based thresholds, with exception
rules for Champions League performance and goalkeepers.

- Base Thresholds: Now require BOTH weighted international appearances (CL/EL
  weighted higher) AND top-5 league appearances to qualify for each tier
- Champions League: Players with 25+ CL goals OR 20+ CL goals+assists qualify as
  Easy
- Goalkeepers: Keepers with 325+ clean sheets and international experience are
  classified as Easy
- Distribution: The split is 4.2% Easy, 4.5% Medium, 6.1% Hard, 85.3% Ultra
  across all 6,651 players

---

## [1.6.0] - 2026-01-18

### Scraper Reliability, Data Integrity & Gameplay Polish

This release repairs the database, makes players easier to find in search, and
rebalances the default difficulty.

### Gameplay Balancing

- Default Difficulty: "Default" used to pick mostly Hard players (73% of the
  database). It now draws 33% Easy / 33% Medium / 33% Hard.

### User Interface

- Search Disambiguation: When multiple players share the same name (e.g.,
  "Fernando"), the search bar shows their full name (e.g., "Fernando (Fernando
  Francisco Reges)").
- Validation: The guess validator accepts these disambiguated names as correct
  answers.
- Score Hiding: Tap the live score badge to hide/censor it (persisted
  preference).

### Data Integrity & Repairs

- Database Repair: Fixed a schema corruption where `scores` referenced a
  non-existent table (`rounds_broken`).
- Search Normalization: Re-processed 6,338 player records to normalize search
  names, so players like "Yaya Touré" can be found with a standard keyboard.
- Data Quality:
  - Repaired 76 players with "Unknown" positions.
  - Verified 100% stats coverage and nationality data.

### Development Workflow

- Quality Gates: Husky runs a pre-commit hook with `prettier --check`
  (formatting) and `vitest` (unit tests), which blocks commits with broken code
  or schema mismatches.

---

## [1.5.2] - 2026-01-18

### Scraper Reliability & Bug Fixes

- Scraper Fix: Added a fallback for retrieving player stats. If transfermarkt
  doesn't select "Overall balance" by default (causing missing stats for players
  like Eriksen), the scraper now retries with `?saison=ges` to force full career
  data.
- Mobile Viewport: Added `interactive-widget=resizes-content` to the viewport
  meta tag, so fixed bottom elements (like the Guess Bar) stay visible above the
  virtual keyboard on mobile.
- Scroll Jump Fix: Added `preventScroll: true` when refocusing the input to stop
  page jumps on mobile.
- Syntax Fixes: Resolved invalid HTML nesting in `index.vue` and TypeScript
  errors in `extract-player-stats.ts`.

---

## [1.5.1] - 2026-01-17

### Patch Release: Security, Mobile Polish & Updates

Security fixes, mobile improvements and an in-app changelog viewer.

### Security Fixes

- Security: Updated dependencies via `npm audit fix` to resolve reported
  vulnerabilities.

### Mobile Improvements

- Keyboard Stability: The guess input stays active while a guess loads, so the
  mobile keyboard no longer closes after each guess.
- Scroll Fixes: Updated the main layout to use Dynamic Viewport Height (`dvh`).
  Before, the mobile address bar made the page scroll or jump when focusing
  inputs or triggering animations.

### New Features

- Changelog Modal: Added an "Updates" button to the home page footer (next to
  "Full Scoring Details") that shows the latest changes inside the app.

---

## [1.5.0] - 2026-01-17

### Major Release: System Reliability, Admin Tools & Visual Polish

System hardening, admin tools and UI/UX changes. This release fixes stability
issues, reworks the "Game Over" experience and the visual feedback.

### New Features

- Admin Reset Tool:
  - API: `POST /api/resetScores` endpoint (atomic transaction) to wipe all game
    data while preserving player references.
  - UI: New `/reset` page using a new `thin` layout.
  - Security: Protected by `SCORING_SECRET`, bypassed automatically in
    development mode.
- Session Integrity:
  - Ghost Session Handling: The game now validates session existence on resume.
    If a local session was deleted server-side (e.g., via reset), a modal
    ("Oooh. Sorry.") tells the user and a fresh game starts instead of a crash.
  - Auto-Recovery: Invalid local state is cleared, so no "ghost" sessions
    remain.

### UI/UX Improvements

- Visuals:
  - Live Score: The score shows whole numbers while it is stable and switches to
    decimals only during a countdown.
  - Tooltips: Timers in tooltips now use standard `MM:SS` format.
  - Glitch Animation: Fixed layout shifts caused by the "wrong guess" shake
    animation. It now shakes only horizontally inside an `overflow-x-hidden`
    container, so the scrollbar no longer flickers.
- Layouts:
  - Thin Layout: A centered, minimal layout for utility pages like `/reset`.
  - Accessibility: Improved contrast and structure on admin pages.

### Bug Fixes

- Scoring Logic:
  - Grace Period Sync: Fixed a desync where hidden transfers (Youth/U23) were
    counted for the "Grace Period", causing the timer to freeze too long for
    players with short careers. The timer now follows the _visible_ transfer
    timeline.
- Stability:
  - Crash Fix: Resolved a `ReferenceError: require is not defined` crash in the
    reset script by decoupling CLI and API logic.
  - Layout Jumps: Fixed vertical page jumping during error animations.

### Technical

- Code Quality:
  - Service Architecture: Moved reset logic to `server/services/admin.ts`.
  - Linting: Fixed markdown linting issues across documentation.
  - Testing: Full test suite passing (119/119 tests).

---

## [1.4.4] - 2026-01-17

### Header & UI Polish

The game header now looks the same across devices.

### Changed

- Header Badges:
  - Mobile: Now arranged in a symmetrical 2x2 Grid (Difficulty | Transfers /
    Guesses | Score).
  - Desktop: Back to a single row with natural widths.
  - Sizing: Removed fixed heights; added full-width filling on mobile.
  - Order: Reordered to [Difficulty, Transfers, Guesses, LiveScore].
  - Grace Timer: Adjusted logic to 2.5s per transfer (was 5s) with a 15s Max Cap
    (was 30s).

## [1.4.3] - 2026-01-15

### Victory Mechanics Polish & Hotfixes

Changes to the screen after a win, which now shows how the score came about, and
fixes for the leaderboard and live score.

### Fixed

- Leaderboard Accuracy: Leaderboard submissions now use the full `score` instead
  of the partial `time_score` (Base + Time).
- Streak Bonus: Fixed logic where streak bonus was calculated on the pre-win
  streak.
- LiveScore Visibility: Fixed a bug where the LiveScore badge disappeared on
  page refresh.

### Changed

- Toast Notifications: Title now displays the Total Score with a detailed
  breakdown.
- Input Refocus: The guess input refocuses after submitting.

## [1.4.2] - 2026-01-15

### Complete Scoring Formula Overhaul

The scoring formula is now all-additive: every bonus and penalty is a percentage
of base × multiplier.

### Changed

- Scoring Formula: New all-additive system:
  - Base × multiplier = adjustedBase
  - - Streak bonus: +5% to +30%
  - − Clue/Wrong guess: -6% each (max -30%)
  - ± Time bonus: +120% instant down to -30% max penalty
- Minimum score: 10% of base.

### Fixed

- Toast notification: Fixed "undefined base pts" and "NaN%" display.
- Unicode Search: Diacritics in player names are normalized.

---

## [1.4.1] - 2026-01-13

### Bug Fixes & Improvements

- Streak Reset: Fixed streaks resetting on random difficulty changes.
- Leaderboard: Fixed stale values by reading live session data.
- Rate Limiting: Increased `submitScore` limit to 30/min.
- No Duplicates: Players no longer repeat within the same session.

---

## [1.4.0] - 2026-01-13

### Loss Mechanics & Difficulty Persistence

- Difficulty Persistence: User-selected difficulty persists across rounds.
- Wrong Guess Penalty: Increased to -10% per guess (max 5), 6th guess = instant
  loss.
- Distinct Loss States: Win, Surrender, Aborted.

---

## [1.3.0] - 2026-01-12

### Difficulty Selection System

- Selector: New Difficulty Selector modal.
- Multipliers: Revised to 1× (Easy) / 2× (Medium) / 3× (Hard) / 4× (Ultra).
- API: Added `?difficulty=X` parameter.

---

## [1.2.2] - 2026-01-12

### Architecture & Reliability

- Validation: Fixed schema mismatches in `requestPlayer` and `sessionStats`.
- Service Layer: Moved DB logic into service modules.

---

## [1.2.1] - 2026-01-10

### Accessibility & Performance

- Accessibility: Added aria-labels to icon buttons.
- Performance: Static glitch animation on mobile to reduce heat.

---

## [1.2.0] - 2026-01-10

### SEO & Meta Optimization

- SEO: Added meta tags, sitemap, robots.txt, canonical URLs.
- Icons: Added favicons and web manifest.

---

## [1.1.0] - 2026-01-10

### Game Integrity & Polish

- Surrender: Added "Give Up" button.
- Anti-Exploit: Page refresh reloads current round.
- Reset: New Game button forces strict session reset.

---

## [1.0.0] - 2026-01-10

### Production Readiness & Stability

- Launch: Initial production release with full service layer, security headers,
  rate limiting, and 100% test coverage for critical paths.

---

## [0.9.0] - 2026-01-07

### Initial Architecture & Beta

- Initial Beta release.
