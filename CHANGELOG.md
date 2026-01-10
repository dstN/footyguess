# Changelog

All notable changes to this project will be documented in this file.

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
