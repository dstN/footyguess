<!-- markdownlint-disable MD024 -->

# Changelog

## [1.5.3] - 2026-01-17

### Mobile Improvements

- **Keyboard Stability**: The guess input field now remains active during the
  loading state. This prevents mobile keyboards from automatically hiding when
  you submit a guess, ensuring a faster and smoother gameplay loop.
- **Scroll Fixes**: Updated the main layout to use Dynamic Viewport Height
  (`dvh`). This fixes an issue where the address bar on mobile devices caused
  the page to slightly scroll/jump when focusing inputs or triggering
  animations.

---

## [1.5.2] - 2026-01-17

### Security

- **Dependencies**: Updated dependencies via `npm audit fix` to resolve reported
  vulnerabilities.

---

## [1.5.1] - 2026-01-17

### Security

- **Dependencies**: Updated dependencies via `npm audit fix` to resolve reported
  vulnerabilities.

---

## [1.5.0] - 2026-01-17

### Major Release: System Reliability, Admin Tools & Visual Polish

This release combines extensive system hardening, new administrative
capabilities, and significant UI/UX refinements into a major update. It
addresses critical stability issues, improves the "Game Over" experience, and
polishes the visual feedback loop.

### New Features

- **Admin Reset Tool**:
  - **API**: `POST /api/resetScores` endpoint (atomic transaction) to wipe all
    game data while preserving player references.
  - **UI**: New minimalist `/reset` page using a new `thin` layout for
    distraction-free administration.
  - **Security**: Protected by `SCORING_SECRET`, with an automatic bypass in
    development mode for easier testing.
- **Session Integrity**:
  - **Ghost Session Handling**: The game now validates session existence on
    resume. If a local session was deleted server-side (e.g., via reset), it
    gracefully informs the user via a friendly modal ("Oooh. Sorry.") and starts
    a fresh game instead of crashing.
  - **Auto-Recovery**: Invalid local state is automatically cleared to strictly
    prevent "ghost" sessions.

### UI/UX Improvements

- **Visual Polish**:
  - **Live Score**: The score display is now "calmer", showing stable integer
    values when not actively changing, and only switching to high-precision
    decimals during active countdowns.
  - **Tooltips**: Timers in tooltips now use standard `MM:SS` format.
  - **Glitch Animation**: Fixed layout shifts caused by the "wrong guess" shake
    animation. It now shakes purely horizontally and runs within an
    `overflow-x-hidden` container to prevent scrollbar flickering or page jumps.
- **Layouts**:
  - **Thin Layout**: A new centered, lightweight layout for utility pages like
    `/reset`.
  - **Accessibility**: Improved contrast and structure on admin pages.

### Bug Fixes

- **Scoring Logic**:
  - **Grace Period Sync**: Fixed a major desync where hidden transfers
    (Youth/U23) were counted for the "Grace Period", causing the timer to freeze
    too long for players with short careers. The timer now perfectly syncs with
    the _visible_ transfer timeline.
- **Stability**:
  - **Crash Fix**: Resolved a `ReferenceError: require is not defined` crash in
    the reset script by decoupling CLI and API logic.
  - **Layout Jumps**: Fixed vertical page jumping during error animations.

### Technical

- **Code Quality**:
  - **Service Architecture**: Moved reset logic to `server/services/admin.ts`.
  - **Linting**: Fixed markdown linting issues across documentation.
  - **Testing**: Full test suite passing (119/119 tests).

---

## [1.4.4] - 2026-01-17

### Header & UI Polish

This release standardizes the game header for a cleaner, consistent experience
across devices.

### Changed

- **Header Badges**:
  - **Mobile**: Now arranged in a symmetrical **2x2 Grid** (Difficulty |
    Transfers / Guesses | Score).
  - **Desktop**: Reverts to a clean single row with natural widths.
  - **Sizing**: Removed fixed heights; added full-width filling on mobile.
  - **Order**: Reordered to [Difficulty, Transfers, Guesses, LiveScore].
  - **Grace Timer**: Adjusted logic to **2.5s per transfer** (was 5s) with a
    **15s Max Cap** (was 30s).

## [1.4.3] - 2026-01-15

### Victory Mechanics Polish & Hotfixes

This release refines the post-victory experience, ensuring score transparency
and fixing discrepancies in the leaderboard and live score systems.

### Fixed

- **Leaderboard Accuracy**: Fixed an issue where leaderboard submissions used
  the partial `time_score` (Base + Time) instead of the full `score`.
- **Streak Bonus**: Fixed logic where streak bonus was calculated on the pre-win
  streak.
- **LiveScore Visibility**: Fixed a bug where the LiveScore badge disappeared on
  page refresh.

### Changed

- **Toast Notifications**: Title now displays the **Total Score** with a
  detailed breakdown.
- **Input Refocus**: Examples: The guess input now automatically refocuses after
  submitting.

## [1.4.2] - 2026-01-15

### Complete Scoring Formula Overhaul

This release rewrites the scoring formula to be **all-additive** — every
bonus/penalty is a percentage of base × multiplier.

### Changed

- **Scoring Formula**: New all-additive system:
  - Base × multiplier = adjustedBase
  - **+ Streak bonus**: +5% to +30%
  - **− Clue/Wrong guess**: -6% each (max -30%)
  - **± Time bonus**: +120% instant → -30% max penalty
- **Minimum score**: 10% of base.

### Fixed

- **Toast notification**: Fixed "undefined base pts" and "NaN%" display.
- **Unicode Search**: Diacritics in player names are normalized.

---

## [1.4.1] - 2026-01-13

### Bug Fixes & Improvements

- **Streak Reset**: Fixed streaks resetting on random difficulty changes.
- **Leaderboard**: Fixed stale values by reading live session data.
- **Rate Limiting**: Increased `submitScore` limit to 30/min.
- **No Duplicates**: Players no longer repeat within the same session.

---

## [1.4.0] - 2026-01-13

### Loss Mechanics & Difficulty Persistence

- **Difficulty Persistence**: User-selected difficulty persists across rounds.
- **Wrong Guess Penalty**: Increased to -10% per guess (max 5), 6th guess =
  instant loss.
- **Distinct Loss States**: Win, Surrender, Aborted.

---

## [1.3.0] - 2026-01-12

### Difficulty Selection System

- **Selector**: New Difficulty Selector modal.
- **Multipliers**: Revised to 1× (Easy) / 2× (Medium) / 3× (Hard) / 4× (Ultra).
- **API**: Added `?difficulty=X` parameter.

---

## [1.2.2] - 2026-01-12

### Architecture & Reliability

- **Validation**: Fixed schema mismatches in `requestPlayer` and `sessionStats`.
- **Service Layer**: Major refactor to move DB logic to service modules.

---

## [1.2.1] - 2026-01-10

### Accessibility & Performance

- **Accessibility**: Added aria-labels to icon buttons.
- **Performance**: Static glitch animation on mobile to reduce heat.

---

## [1.2.0] - 2026-01-10

### SEO & Meta Optimization

- **SEO**: Added meta tags, sitemap, robots.txt, canonical URLs.
- **Icons**: Added favicons and web manifest.

---

## [1.1.0] - 2026-01-10

### Game Integrity & Polish

- **Surrender**: Added "Give Up" button.
- **Anti-Exploit**: Page refresh reloads current round.
- **Reset**: New Game button forces strict session reset.

---

## [1.0.0] - 2026-01-10

### Production Readiness & Stability

- **Launch**: Initial production release with full service layer, security
  headers, rate limiting, and 100% test coverage for critical paths.

---

## [0.9.0] - 2026-01-07

### Initial Architecture & Beta

- Initial Beta release.
