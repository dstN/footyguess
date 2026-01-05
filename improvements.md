# Code Review & Improvement Opportunities

**Last Reviewed:** January 5, 2026  
**Framework:** Nuxt 4 + Vue 3 + SQLite + TypeScript (Strict Mode)  
**Scope:** Full repository analysis for code quality, readability,
maintainability, and best practices

---

## Executive Summary

The codebase demonstrates solid architectural patterns and type safety, but has
opportunities for improvement in:

- **Component/Composable Complexity:** Several files exceed 280+ lines
  (usePlayGame: 343, TransferTimelineCard: 312, scrape-players: 444)
- **Code Duplication:** Repeated JSON parsing patterns, similar error handling
  blocks, duplicate validation logic
- **Accessibility:** Missing ARIA labels, semantic HTML, keyboard navigation
  hints, and color-contrast concerns
- **Backend Organization:** Monolithic scraper scripts need modularity
- **Frontend State Management:** Mixed reactive patterns without consistent
  error boundary handling
- **Internationalization (i18n):** Hard-coded English text throughout, making
  multi-language support difficult
- **Error Handling:** Inconsistent error patterns across API routes
- **Testing Coverage:** Only 13 tests for a production app with 6500+ lines

---

## 1. FRONTEND IMPROVEMENTS

### 1.1 Component Complexity & Modularity

#### Issue 1.1.1: TransferTimelineCard.vue is too large (311 lines)

**Severity:** HIGH | **Category:** Frontend  
**File:** [components/TransferTimelineCard.vue](components/TransferTimelineCard.vue)

**Problem:**

- Single component handling timeline rendering, difficulty badge logic,
  statistics display, and responsive layout
- Complex conditional logic for two-column vs timeline rendering
- Difficulty badge calculation mixed with rendering logic

**Recommendation:** Split into:

1. `TransferTimelineCard.vue` - Main container (100 lines)
2. `TransferTimelineView.vue` - Timeline display logic (120 lines)
3. `DifficultyBadge.vue` - Reusable difficulty display (50 lines)
4. `TransferItem.vue` - Individual transfer card (80 lines)

**Benefits:**

- Easier to test and maintain
- Reusable difficulty badge across app
- Single responsibility principle
- Better performance with proper component boundaries

---

#### Issue 1.1.2: usePlayGame.ts is too large (342 lines)

**Severity:** HIGH | **Category:** Frontend  
**File:** [composables/usePlayGame.ts](composables/usePlayGame.ts)

**Problem:**

- Manages player loading, guess submission, clue handling, session management,
  and scoring
- Multiple concerns: form state, API coordination, UI state, localStorage sync
- 50+ reactive variables and computed properties
- Difficult to test individual features

**Recommendation:** Extract into focused composables:

1. `useGameSession.ts` - Session & round management (60 lines)
2. `useGuessSubmission.ts` - Guess logic and scoring (80 lines)
3. `useGameState.ts` - Core player/round state (70 lines)
4. Keep main composable as orchestrator (120 lines)

**Benefits:**

- Clear separation of concerns
- Easier unit testing
- Better code reusability
- Reduced cognitive load

---

#### Issue 1.1.3: play.vue page is too large (290 lines)

**Severity:** MEDIUM | **Category:** Frontend  
**File:** [pages/play.vue](pages/play.vue)

**Problem:**

- Mixing game UI layout with complex state management
- Long template with nested conditionals
- Drag-and-drop gesture handling inline
- Difficulty modal logic inline

**Recommendation:** Extract components:

1. `GameHeader.vue` - Top section with badges (40 lines)
2. `GameContent.vue` - Main game display (100 lines)
3. `ResetModal.vue` - Confirmation dialog (50 lines)
4. `GestureHandler.vue` - Swipe logic wrapper (30 lines)

---

#### Issue 1.1.4: won.vue page is large (235 lines)

**Severity:** MEDIUM | **Category:** Frontend  
**File:** [pages/won.vue](pages/won.vue)

**Problem:**

- Mixed concerns: score display, leaderboard, share functionality
- Complex computed properties for formatting
- Long template with multiple sections

**Recommendation:** Extract:

1. `ScoreSnapshot.vue` - Score breakdown (50 lines)
2. `LeaderboardSection.vue` - Leaderboard display (60 lines)
3. `ActionButtons.vue` - Navigation buttons (30 lines)

---

#### Issue 1.1.5: layout/default.vue has complex CSS-in-JS

**Severity:** MEDIUM | **Category:** Frontend  
**File:** [layouts/default.vue](layouts/default.vue)

**Problem:**

- Heavy CSS animations and effects with scoped styles
- Difficult to maintain cyber aesthetic with CSS in component
- No reusable theme/styling system
- Performance impact from complex gradients and animations

**Recommendation:**

1. Extract styles to `assets/css/theme.css`
2. Create `composables/useThemeAnimations.ts`
3. Use Tailwind CSS @apply directives for complex patterns
4. Document animation performance implications

---

### 1.2 Accessibility Issues

#### Issue 1.2.1: Missing semantic HTML and ARIA labels

**Severity:** MEDIUM | **Category:** Frontend  
**Files:** `components/*.vue`, `pages/*.vue`, `layouts/*.vue`

**Problems:**

- No proper heading hierarchy (multiple h1s in some pages)
- `<div>` used for buttons/interactive elements without proper roles
- Missing `aria-label` on icon buttons
- No `aria-live` regions for dynamic content updates
- Missing alt text patterns for icons
- No skip-to-content link
- Form inputs lack proper `labels` and `aria-describedby`

**Examples Found:**

```vue
<!-- BAD: Icon button without label -->
<UButton icon="i-lucide-x" @click="..." />

<!-- GOOD: -->
<UButton icon="i-lucide-x" :aria-label="`Clear search`" @click="..." />
```

**Recommendation:**

1. Audit all interactive elements for ARIA labels
2. Add skip-to-content link in layout
3. Use proper semantic HTML (e.g., `<button>` not `<div>`)
4. Add `aria-live="polite"` to toast notifications and score updates
5. Use `aria-describedby` for form validation messages

**Coverage Needed:**

- [components/GuessFooter.vue](components/GuessFooter.vue)
- [components/ClueBar.vue](components/ClueBar.vue)
- [components/StreakBar.vue](components/StreakBar.vue)
- [pages/play.vue](pages/play.vue)
- [pages/won.vue](pages/won.vue)
- [pages/index.vue](pages/index.vue)

---

#### Issue 1.2.2: Color contrast may fail accessibility standards

**Severity:** MEDIUM | **Category:** Frontend

**Problems:**

- Slate-300 on dark backgrounds might not meet WCAG AA contrast
- Pink/magenta accent colors on semi-transparent backgrounds unclear
- Text in badges may have insufficient contrast

**Recommendation:**

1. Run WAVE or Axe accessibility audits
2. Test with WebAIM contrast checker
3. Adjust color palette if needed to meet WCAG AA minimum
4. Document colors with contrast values

---

#### Issue 1.2.3: Keyboard navigation support incomplete

**Severity:** MEDIUM | **Category:** Frontend

**Problems:**

- Gesture handlers (swipe) not keyboard accessible
- Modal dialogs may not trap focus properly
- Search dropdown may not support arrow key navigation

**Recommendation:**

1. Implement keyboard shortcut help (?)
2. Ensure all interactive elements Tab-navigable
3. Add focus trap to modals
4. Support arrow keys in search/autocomplete
5. Document keyboard shortcuts (Enter to submit, Esc to cancel, etc.)

---

### 1.3 Frontend State Management

#### Issue 1.3.1: Inconsistent error handling patterns

**Severity:** MEDIUM | **Category:** Frontend  
**Files:** [composables/usePlayGame.ts](composables/usePlayGame.ts),
`composables/*.ts`

**Problem:**

```typescript
// Inconsistent: Some places set error state, others use try/catch only
try {
  // ...
} catch (err) {
  if (import.meta.dev) console.error("...", err);
  errorMessage.value = "...";
  // Other places forget to set error state
}
```

**Recommendation:**

1. Create `useGameError.ts` composable for centralized error handling
2. Standard error types and messages
3. Error boundary component for fallback UI
4. Consistent error logging and user feedback

---

#### Issue 1.3.2: Mixed reactive patterns

**Severity:** LOW | **Category:** Frontend

**Problems:**

- Mix of `ref()` and `reactive()` without clear pattern
- Some state in composables, some in components
- Inconsistent naming conventions (camelCase vs snake_case in data)

**Recommendation:**

- Use `ref()` for simple values, `reactive()` for objects/forms
- Document state management layer boundaries
- Create composable pattern guide in README

---

### 1.4 Frontend Performance

#### Issue 1.4.1: Missing memoization in computed properties

**Severity:** LOW | **Category:** Frontend

**Problem:**

- `useCluePool.ts` computes clue arrays on every player change
- `TransferTimelineCard.vue` recalculates styling every render

**Recommendation:** Use `computed()` with proper dependency tracking; consider
`useMemoize` for complex calculations

---

## 2. BACKEND IMPROVEMENTS

### 2.1 API Route Organization

#### Issue 2.1.1: API routes lack consistent patterns

**Severity:** MEDIUM | **Category:** Backend

**Files:** `server/api/*.ts`

**Problems:**

- Mixed error handling approaches
- Some routes validate input, others don't
- Inconsistent response shapes
- Some use `sendError()`, others throw
- No standardized error codes

**Examples:**

```typescript
// randomPlayer.ts
if (!parsed.ok) {
  return sendError(event, createError({ statusCode: 400, ... }));
}

// vs submitScore.ts
if (!parsed.ok) {
  return sendError(event, createError({ statusCode: 400, ... }));
}
```

**Recommendation:**

1. Create `server/utils/api.ts` with:
   - `validateRequest()` helper
   - Standard error response builder
   - Success response wrapper
2. Apply consistently to all routes
3. Create API error codes enum

---

#### Issue 2.1.2: Large API routes with business logic

**Severity:** MEDIUM | **Category:** Backend

**Files:**

- [server/api/guess.ts](server/api/guess.ts) (210 lines)
- [server/api/submitScore.ts](server/api/submitScore.ts) (192 lines)
- [server/api/getPlayer.ts](server/api/getPlayer.ts) (164 lines)

**Problems:**

- Query building mixed with business logic
- JSON parsing and validation scattered
- Difficulty calculations inline
- Score calculations embedded

**Recommendation:** Extract business logic:

```
server/
  api/
    guess.ts (70 lines - handler only)
    submitScore.ts (70 lines - handler only)
  services/
    GuessService.ts (70 lines)
    ScoreService.ts (60 lines)
  queries/
    PlayerQueries.ts
    RoundQueries.ts
```

---

#### Issue 2.1.3: Inconsistent validation approach

**Severity:** MEDIUM | **Category:** Backend

**Problem:**

- Valibot validation in all routes but inconsistent schemas
- No reusable validation schemas
- `parseSchema()` error handling duplicated

**Recommendation:**

1. Create `server/schemas/` with reusable schemas:
   - `common.ts` - Shared patterns
   - `player.ts` - Player-related
   - `round.ts` - Round-related
   - `score.ts` - Scoring
2. Create validation helper with consistent error responses

---

### 2.2 Database & Query Optimization

#### Issue 2.2.1: N+1 query patterns remain in some routes

**Severity:** MEDIUM | **Category:** Backend

**Files:**

- [server/api/getPlayer.ts](server/api/getPlayer.ts) - Queries player, then
  transfers, then stats
- [server/api/randomPlayer.ts](server/api/randomPlayer.ts) - Multiple roundtrip
  queries

**Recommendation:**

1. Use batch loading for related data
2. Create query builder utilities
3. Add query logging in dev mode
4. Monitor production queries

---

#### Issue 2.2.2: Database connection lacks connection pooling

**Severity:** LOW | **Category:** Backend

**File:** [server/db/connection.ts](server/db/connection.ts)

**Problem:**

- Single sqlite connection works for SQLite but should document limitations
- No connection management utilities

**Recommendation:**

- Document that SQLite doesn't need pooling (single writer)
- Add comment explaining this in connection.ts
- Consider migration path to PostgreSQL if scale grows

---

#### Issue 2.2.3: Missing database indexes for common queries

**Severity:** MEDIUM | **Category:** Backend

**File:** [server/db/schema.ts](server/db/schema.ts)

**Problems:**

- Few indexes defined
- `player_id` in transfers frequently queried but no index
- `session_id` in rounds/scores frequently queried but no index
- `player_name` searches could benefit from index

**Missing Indexes:**

```sql
CREATE INDEX idx_player_stats_player_id ON player_stats(player_id);
CREATE INDEX idx_rounds_session_id ON rounds(session_id);
CREATE INDEX idx_scores_session_id ON scores(session_id);
CREATE INDEX idx_rounds_player_id ON rounds(player_id);
CREATE INDEX idx_players_name_search ON players(name_search);
```

---

### 2.3 Scraper Architecture

#### Issue 2.3.1: Monolithic scraper script (443 lines)

**Severity:** HIGH | **Category:** Backend

**File:** [server/scraper/scrape-players.ts](server/scraper/scrape-players.ts)

**Problems:**

- Single file handling player list, browser management, scraping logic, error
  handling, database operations
- Difficult to test
- Cookie handling mixed with scraping logic
- Progress tracking inline
- Error logging scattered

**Recommendation:** Extract into:

```
server/scraper/
  browser-manager.ts (80 lines) - Browser setup/teardown
  player-scraper.ts (120 lines) - Core scraping logic
  error-handler.ts (50 lines) - Centralized error logging
  progress-tracker.ts (40 lines) - Progress reporting
  index.ts (70 lines) - Orchestration
```

---

#### Issue 2.3.2: Duplicated scraping logic across files

**Severity:** MEDIUM | **Category:** Backend

**Files:**

- [server/scraper/scrape-transfers.ts](server/scraper/scrape-transfers.ts) (296
  lines)
- [server/scraper/scrape-career.ts](server/scraper/scrape-career.ts) (178 lines)
- [server/scraper/scrape-players.ts](server/scraper/scrape-players.ts) (443
  lines)

**Problems:**

- Similar Puppeteer page navigation patterns
- Duplicate error handling
- Similar HTML parsing logic

**Recommendation:**

1. Create `server/scraper/utils/puppeteer-helpers.ts`:
   - `navigateWithRetry()`
   - `waitForElement()`
   - `extractText()`
   - `extractTable()`
2. Create `server/scraper/utils/html-parser.ts`:
   - Centralize DOM parsing logic

---

#### Issue 2.3.3: Insufficient error handling in scraper

**Severity:** MEDIUM | **Category:** Backend

**File:** [server/scraper/scrape-players.ts](server/scraper/scrape-players.ts)

**Problems:**

- Many potential points of failure with minimal recovery
- Timeouts not always handled
- Network errors mixed with parsing errors
- No retry strategy for transient failures

**Recommendation:**

1. Implement exponential backoff retry logic
2. Distinguish between retryable and non-retryable errors
3. Add circuit breaker pattern for failing sources
4. Create `server/utils/retry.ts`

---

### 2.4 Utilities & Helpers

#### Issue 2.4.1: Difficulty calculation is complex and hard to follow

**Severity:** MEDIUM | **Category:** Backend

**File:** [server/utils/difficulty.ts](server/utils/difficulty.ts)

**Problem:**

- Many magic numbers and thresholds
- Complex logic for determining tier
- Hard to adjust difficulty without breaking logic
- International vs Top5 logic intertwined

**Recommendation:**

1. Move constants to `server/config/difficulty-config.ts`:
   ```typescript
   export const DIFFICULTY_CONFIG = {
     INTERNATIONAL: {
       thresholds: [80, 60, 45, 0],
       multipliers: [1, 1.25, 1.5, 2],
     },
     TOP5: {
       thresholds: [400, 200, 100, 0],
       multipliers: [1, 1.25, 1.5, 2],
     },
   };
   ```
2. Simplify logic with lookup tables
3. Add unit tests for each tier

---

#### Issue 2.4.2: JSON parsing repeated in multiple places

**Severity:** MEDIUM | **Category:** Backend

**Files:**

- [server/api/randomPlayer.ts](server/api/randomPlayer.ts)
- [server/api/getPlayer.ts](server/api/getPlayer.ts)

**Pattern:**

```typescript
if (typeof base.secondary_positions === "string") {
  base.secondary_positions = JSON.parse(base.secondary_positions);
}
if (typeof base.nationalities === "string") {
  base.nationalities = JSON.parse(base.nationalities);
}
```

**Recommendation:** Create utility:

```typescript
// server/utils/player-parser.ts
export function parsePlayerData(player: Player): Player {
  return {
    ...player,
    secondary_positions: parseIfString(player.secondary_positions),
    nationalities: parseIfString(player.nationalities),
    total_stats: parseIfString(player.total_stats),
  };
}
```

---

### 2.5 Logging & Observability

#### Issue 2.5.1: Inconsistent logging across application

**Severity:** MEDIUM | **Category:** Backend

**Problems:**

- Some code uses `logError()`, some uses `console.error()`
- No request ID tracking
- No structured logging
- No log levels enforcement
- Scraper logs to file, API logs to console

**Recommendation:**

1. Implement structured logging with winston or pino
2. Add request ID middleware
3. Create log aggregation
4. Consistent log levels across app
5. Example:

```typescript
// server/utils/logger.ts
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});
```

---

## 3. INTERNATIONALIZATION (i18n) - Feature Opportunity

### Issue 3.0: Hard-coded English text throughout

**Severity:** HIGH | **Category:** Feature Request - i18n

**Scope:** ~150+ text strings across frontend and backend

**Current Hard-coded Strings Examples:**

- "Decode the career path, grab a random tip, and lock in your guess."
- "Please guess a player"
- "Clues" / "Age" / "Origin" / "Position"
- "Streaks"
- "Career totals"
- etc.

**Recommendation:**

1. **Setup i18n with nuxt-i18n:**

```bash
npm install @nuxtjs/i18n
```

2. **Create translation files:**

```
locales/
  en.json (base English)
  es.json (Spanish)
  fr.json (French)
  de.json (German)
  it.json (Italian)
  pt.json (Portuguese)
```

3. **Frontend usage:**

```vue
<h1>{{ $t('game.title') }}</h1>
<p>{{ $t('game.description') }}</p>
```

4. **Backend usage for user-facing messages:**

- Create `server/i18n/messages.ts` with message templates
- Pass locale in request header
- Return localized error messages

5. **Database considerations:**

- Store competition names in original language (TransferMarkt)
- Translate only UI elements, not data

6. **Benefits:**

- Reach European market (Spanish, French, German, Italian, Portuguese speakers)
- Future-proof for expansion
- Each language potentially adds 20-30% more users

**Estimated Effort:** 3-4 days for basic implementation

---

## 4. TESTING & QA

### Issue 4.1: Insufficient test coverage

**Severity:** HIGH | **Category:** Testing

**Current State:**

- 13 tests covering basic composables and API routes
- **Estimated Coverage: 15-20%**
- No E2E tests
- No integration tests

**Missing Test Coverage:**

- API error paths
- Database transactions and rollback
- Difficulty calculations (edge cases)
- Scraper error handling
- Rate limiting edge cases
- Session management race conditions

**Recommendation:**

1. **Add API route tests:**

   - Error cases for each route
   - Rate limit exceeded scenarios
   - Input validation edge cases
   - Estimated: 40+ tests

2. **Add integration tests:**

   - End-to-end game flow
   - Score submission and leaderboard
   - Session lifecycle
   - Estimated: 20+ tests

3. **Add E2E tests with Playwright:**
   - Game UI flow
   - Mobile responsive behavior
   - Accessibility checks
   - Estimated: 15+ tests

**Target:** 70%+ code coverage

---

### Issue 4.2: No accessibility testing

**Severity:** MEDIUM | **Category:** Testing

**Recommendation:**

1. Add accessibility tests with vitest-axe
2. Run automated WCAG checks in CI/CD
3. Manual testing with screen readers
4. Mobile accessibility testing

---

## 5. TYPE SAFETY & CODE QUALITY

### Issue 5.1: Some API routes use `any` type

**Severity:** MEDIUM | **Category:** Type Safety

**Found In:**

- [pages/play.vue](pages/play.vue) - `FormSubmitEvent<any>`
- [components/GuessFooter.vue](components/GuessFooter.vue) - `any` schema and
  state

**Recommendation:** Create proper types:

```typescript
// types/forms.ts
export interface GuessFormState {
  guess: string;
}

export const GuessFormSchema = v.object({
  guess: v.pipe(v.string(), v.minLength(1, "Please guess a player")),
});
```

---

### Issue 5.2: Player type missing some fields

**Severity:** LOW | **Category:** Type Safety

**File:** [types/player.ts](types/player.ts)

**Problem:**

- Some fields used in code not in Player type
- `currentClub` added dynamically from query
- No TypeScript completion for database fields

**Recommendation:** Review all database columns and ensure type completeness

---

## 6. PERFORMANCE OPTIMIZATIONS

### Issue 6.1: Large JSON parsing in browser

**Severity:** LOW | **Category:** Performance

**Problem:**

- Player objects include all stats/transfers in JSON
- Parsing large objects on every player load
- Could defer loading

**Recommendation:**

1. Split player data into core + additional info
2. Lazy load stats and transfers if needed for UI
3. Consider API response compression

---

### Issue 6.2: No service worker for offline support

**Severity:** LOW | **Category:** Performance

**Opportunity:**

- Cache recent players
- Offline score submission queue
- Estimated effort: 2 days

---

## 7. CODE ORGANIZATION & NAMING

### Issue 7.1: Inconsistent naming conventions

**Severity:** LOW | **Category:** Code Style

**Examples:**

- `getRandomPlayer()` vs `performSearch()`
- `tm_id` vs `tmId` in different contexts
- `usePlayGame` vs `usePlayerSearch` ordering

**Recommendation:**

- Document naming conventions
- Run codemod to standardize (e.g., all database fields snake_case, all JS
  variables camelCase)

---

### Issue 7.2: Missing JSDoc/comments in complex functions

**Severity:** MEDIUM | **Category:** Documentation

**Files needing docs:**

- `difficulty.ts` - Tier calculation algorithm
- `rate-limit.ts` - Bucketing strategy
- `seeded-random.ts` - Seed formula
- `useCluePool.ts` - Clue selection logic

**Recommendation:** Add JSDoc comments with examples and edge cases

---

## 8. SECURITY CONSIDERATIONS

### Issue 8.1: XSS protection adequate but could be stronger

**Severity:** LOW | **Category:** Security

**Current:**

- `sanitizeText()` for localStorage display
- Vue auto-escaping in templates

**Improvements:**

- Add CSP headers in nuxt.config
- Validate and sanitize all user input at API level
- Use DOMPurify for any innerHTML operations (none currently)

**Recommendation:**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // ...
  nitro: {
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'",
    },
  },
});
```

---

### Issue 8.2: Rate limiting could be more sophisticated

**Severity:** LOW | **Category:** Security

**Current:**

- Per-route limits working well
- Simple in-memory bucket store

**Could Add:**

- Distributed rate limiting for multi-instance deployments
- Different limits for authenticated users
- IP reputation checking

**Recommendation:** Document current approach; note improvements for scale

---

## 9. DEPENDENCY & BUILD OPTIMIZATION

### Issue 9.1: Build bundle not analyzed

**Severity:** LOW | **Category:** Build

**Recommendation:**

```bash
npm install --save-dev nuxt-build-analyzer
```

Check for:

- Large component libraries
- Unused dependencies
- Tree-shaking effectiveness

---

## 10. DEPLOYMENT & DEVOPS

### Issue 10.1: No Docker support

**Severity:** LOW | **Category:** DevOps

**Opportunity:**

- Add Dockerfile for consistent deployments
- docker-compose for local development
- GitHub Actions CI/CD

---

## SUMMARY TABLE

| Priority | Category      | Issue                                      | Effort | Impact |
| -------- | ------------- | ------------------------------------------ | ------ | ------ |
| CRITICAL | Frontend      | Component size (usePlayGame 342L)          | Medium | High   |
| CRITICAL | Backend       | Monolithic scraper (443L)                  | Medium | High   |
| HIGH     | Frontend      | Component size (TransferTimelineCard 311L) | Medium | High   |
| HIGH     | Backend       | API route patterns                         | Medium | High   |
| HIGH     | Testing       | Low test coverage (13 tests)               | High   | Medium |
| HIGH     | Feature       | i18n support (150+ strings)                | High   | Medium |
| MEDIUM   | Frontend      | Accessibility issues                       | High   | High   |
| MEDIUM   | Backend       | Validation inconsistency                   | Medium | Medium |
| MEDIUM   | Backend       | Missing DB indexes                         | Low    | High   |
| MEDIUM   | Backend       | Scraper error handling                     | Medium | Medium |
| MEDIUM   | Documentation | Missing JSDoc                              | Low    | Medium |
| LOW      | Performance   | Large JSON parsing                         | Low    | Low    |
| LOW      | Security      | CSP headers                                | Low    | Low    |
| LOW      | DevOps        | Docker support                             | Low    | Low    |

---

## RECOMMENDATIONS BY PRIORITY

### Phase 1 (Immediate - 1-2 sprints)

1. ✅ Split usePlayGame.ts into focused composables
2. ✅ Extract TransferTimelineCard.vue components
3. ✅ Standardize API route patterns
4. ✅ Add missing DB indexes
5. ✅ Accessibility audit and fixes

### Phase 2 (Short-term - 2-3 sprints)

1. Refactor scraper into modular services
2. Increase test coverage to 50%+
3. Add comprehensive JSDoc comments
4. Implement structured logging
5. Extract difficulty configuration

### Phase 3 (Medium-term - 1-2 months)

1. Implement i18n support
2. Add E2E tests with Playwright
3. Optimize bundle size
4. Add Docker and CI/CD
5. Performance monitoring

---

**Total Estimated Effort:** ~6-8 weeks for full implementation  
**ROI:** Significantly improved maintainability, scalability, and accessibility
