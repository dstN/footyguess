# GitHub Issues - Code Review (Auto-generated)

## Format: YAML for GitHub Issue Template
## Use: Copy each issue to GitHub's issue creation form or use GitHub API

---

## CRITICAL ISSUES

### Issue 1: Refactor usePlayGame - Too Large & Complex
```
Title: refactor(frontend): split usePlayGame into focused composables
Labels: improvement, frontend, refactor, high-priority
Milestone: Phase 1
Assignee: 
Priority: CRITICAL

## Description

### Problem
`composables/usePlayGame.ts` is 342 lines and acts as a god object coordinating:
- Game session management
- Guess submission and scoring
- Clue pool management
- Player search
- Streak tracking
- Form state
- UI interactions

This makes it difficult to:
- Understand individual features
- Test components in isolation
- Reuse logic elsewhere
- Add new features without affecting existing logic

### Current Structure
\`\`\`
usePlayGame (342 lines)
├── useGameSession
├── useGameStreak  
├── useCluePool
├── usePlayerSearch
├── useTransferTimeline
└── useGuessSubmission
\`\`\`

### Proposed Solution

Split into focused composables:

1. **useGameState.ts** (70 lines)
   - Current player state
   - Round information
   - Loading/error states
   - Exports: player, round, currentName, isLoading, errorMessage

2. **useGameForm.ts** (50 lines)
   - Form state management
   - Guess validation
   - Exports: formState, hasGuess, clearGuess

3. **useGameUI.ts** (60 lines)
   - UI interactions
   - Modal state
   - Reset dialog
   - Exports: confirmResetOpen, requestNewPlayer, confirmNewPlayer, cancelNewPlayer

4. **useGameOrchestrator.ts** (120 lines)
   - Orchestrates other composables
   - Remains as main export from usePlayGame
   - Minimal logic, mostly composition

### Benefits
- Single responsibility principle
- Easier testing of individual features
- Better code reusability
- Clearer dependency graph
- Reduced cognitive load

### Implementation Steps
1. Create new composables
2. Move code from usePlayGame
3. Update imports in play.vue
4. Add tests for new composables
5. Remove original usePlayGame content

### Files to Change
- composables/usePlayGame.ts (refactor)
- composables/useGameState.ts (new)
- composables/useGameForm.ts (new)
- composables/useGameUI.ts (new)
- pages/play.vue (update imports)
- tests/usePlayGame.test.ts (split tests)

### Acceptance Criteria
- [ ] All 3 new composables created
- [ ] Original composables still work via orchestrator
- [ ] All tests passing
- [ ] Code coverage maintained or improved
- [ ] play.vue imports unchanged

### Effort Estimate
- Medium (2-3 days)

### Related
- None
```

---

### Issue 2: Refactor scrape-players.ts - Monolithic Script
```
Title: refactor(backend): modularize scrape-players script
Labels: improvement, backend, refactor, high-priority
Milestone: Phase 1
Assignee:
Priority: CRITICAL

## Description

### Problem
`server/scraper/scrape-players.ts` is 443 lines and handles:
- Browser management
- Player list loading
- Pagination logic
- Worker pool coordination
- Error handling
- Progress tracking
- Cookie consent
- Database writes

This causes:
- Difficulty understanding control flow
- Hard to test individual components
- Difficult to reuse utilities
- Error handling scattered throughout
- Poor maintainability

### Current Architecture
\`\`\`
scrape-players.ts (443 lines)
├── Browser initialization
├── Cookie handling  
├── Player loading
├── Pagination loop
├── Worker pool management
├── Error handling
├── Progress tracking
└── Database operations
\`\`\`

### Proposed Solution

Extract into focused modules:

1. **browser-manager.ts** (80 lines)
   - Browser launch/close
   - Page creation
   - Resource cleanup
   - Exports: BrowserManager class

2. **worker-pool.ts** (100 lines)
   - Concurrent worker management
   - Task queue
   - Error isolation per worker
   - Exports: WorkerPool class

3. **scraper-orchestrator.ts** (90 lines)
   - Main loop
   - Pagination
   - Progress tracking
   - Exports: ScraperOrchestrator class

4. **error-handler.ts** (50 lines)
   - Centralized error logging
   - Error categorization
   - Retry decisions
   - Exports: handleScraperError, isRetryable

5. **index.ts** (70 lines)
   - Entry point
   - Environment setup
   - Orchestration

### Benefits
- Cleaner, more testable code
- Easier to add features
- Better error handling
- Easier debugging
- Reusable components

### Implementation Steps
1. Create new modules
2. Move code to appropriate files
3. Update imports in index.ts
4. Add tests for each module
5. Verify scraper still works
6. Update documentation

### Files to Change
- server/scraper/scrape-players.ts (refactor)
- server/scraper/browser-manager.ts (new)
- server/scraper/worker-pool.ts (new)
- server/scraper/scraper-orchestrator.ts (new)
- server/scraper/error-handler.ts (new)
- server/scraper/index.ts (update)
- tests/scraper.test.ts (add)

### Acceptance Criteria
- [ ] All 4 new modules created
- [ ] scraper still executes successfully
- [ ] All tests passing
- [ ] Error handling improved
- [ ] Code is more readable

### Effort Estimate
- Medium (2-3 days)

### Related Issues
- #??? (Scraper error handling improvements)
```

---

### Issue 3: Extract TransferTimelineCard - Component Too Large
```
Title: refactor(frontend): split TransferTimelineCard into smaller components
Labels: improvement, frontend, refactor, component-size
Milestone: Phase 1
Assignee:
Priority: HIGH

## Description

### Problem
`components/TransferTimelineCard.vue` is 311 lines handling:
- Card container styling
- Timeline rendering
- Difficulty badge
- Statistics display
- Responsive layout (desktop vs mobile)
- Loading states

This makes it:
- Hard to maintain
- Difficult to test
- Not reusable
- Complex template

### Current Structure
\`\`\`
TransferTimelineCard (311 lines)
├── Card wrapper
├── Header with badge and title
├── Timeline rendering
├── Stats display
└── Loading skeleton
\`\`\`

### Proposed Solution

Split into 4 components:

1. **TransferTimelineCard.vue** (100 lines)
   - Main container
   - Header layout
   - Imports child components

2. **TransferTimelineView.vue** (120 lines)
   - Timeline/list rendering
   - Individual transfer items
   - Loading state

3. **DifficultyBadge.vue** (50 lines)
   - Reusable difficulty display
   - Color coding
   - Tooltip
   - Can be used elsewhere

4. **TransferItem.vue** (80 lines)
   - Individual transfer card
   - Date, from, to, fee
   - Hover effects
   - Expandable

### Benefits
- Easier to understand each component
- Reusable difficulty badge
- Better testability
- Clearer responsibilities
- Easier to style

### Implementation Steps
1. Create new components
2. Move code to appropriate files
3. Update parent components
4. Verify visual appearance
5. Add tests for new components

### Files to Change
- components/TransferTimelineCard.vue (refactor)
- components/TransferTimelineView.vue (new)
- components/DifficultyBadge.vue (new)
- components/TransferItem.vue (new)
- tests/components.test.ts (add)

### Acceptance Criteria
- [ ] All 3 new components created
- [ ] TransferTimelineCard still works
- [ ] DifficultyBadge is reusable
- [ ] All tests passing
- [ ] Visual appearance unchanged

### Effort Estimate
- Medium (1-2 days)

### Related
- Issue #5 (State management with Pinia)
```

---

## HIGH PRIORITY ISSUES

### Issue 4: Accessibility Audit - Missing ARIA Labels
```
Title: fix(frontend): add missing ARIA labels and semantic HTML
Labels: improvement, frontend, accessibility, high-priority
Milestone: Phase 1
Assignee:
Priority: HIGH

## Description

### Problem
Multiple components missing ARIA labels and semantic HTML:

1. **Icon buttons without labels**
   - Examples: StreakBar, ClueBar, various action buttons
   - Screen reader users won't know button purpose

2. **Interactive elements without roles**
   - Divs used as buttons without button role
   - Lists not marked as lists

3. **Form inputs without labels**
   - Search input in GuessFooter lacks proper label
   - Error messages not associated with inputs

4. **No screen reader announcements**
   - Dynamic content updates not announced
   - Clue reveals not announced
   - Score updates not announced

5. **Missing heading hierarchy**
   - Multiple h1 elements in some pages
   - No clear structure for screen readers

6. **No skip-to-content link**
   - Users must Tab through all navigation

### Affected Components
- [ ] pages/play.vue
- [ ] pages/won.vue
- [ ] pages/index.vue
- [ ] components/GuessFooter.vue
- [ ] components/StreakBar.vue
- [ ] components/ClueBar.vue
- [ ] components/PlayHeader.vue
- [ ] components/TransferTimelineCard.vue
- [ ] layouts/default.vue

### Solution

#### 1. Icon Buttons
\`\`\`vue
<!-- Before -->
<UButton icon="i-lucide-x" @click="clear" />

<!-- After -->
<UButton icon="i-lucide-x" aria-label="Clear search" @click="clear" />
\`\`\`

#### 2. Form Labels
\`\`\`vue
<!-- Before -->
<UInputMenu v-model="guess" placeholder="..." />

<!-- After -->
<label for="player-guess" class="sr-only">Player name</label>
<UInputMenu id="player-guess" v-model="guess" />
\`\`\`

#### 3. Screen Reader Announcements
\`\`\`vue
<div
  v-if="clueRevealed"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="sr-only"
>
  New clue: {{ clue }}
</div>
\`\`\`

#### 4. Heading Structure
\`\`\`vue
<!-- Ensure only one h1 per page -->
<h1>Game Title</h1>
<h2>Section 1</h2>
<h3>Subsection</h3>
\`\`\`

### Acceptance Criteria
- [ ] All icon buttons have aria-label
- [ ] Form inputs have proper labels
- [ ] Dynamic updates announced to screen readers
- [ ] Heading hierarchy correct
- [ ] Skip link present
- [ ] axe or WAVE audit passes
- [ ] All tests passing

### Testing
\`\`\`bash
npm run a11y:check  # Run accessibility audit
npm run test        # Ensure tests still pass
\`\`\`

### Effort Estimate
- High (2-3 days)

### Related
- Issue #?? (Color contrast verification)
- Issue #?? (Keyboard navigation)
```

---

### Issue 5: State Management - Introduce Pinia Store
```
Title: refactor(frontend): introduce Pinia for centralized state
Labels: improvement, frontend, refactor, state-management
Milestone: Phase 2
Assignee:
Priority: HIGH

## Description

### Problem
Current state management uses:
- Props drilling (19+ props through component hierarchy)
- Mixed composable state (useGameSession, useGameStreak, etc.)
- No centralized store
- Difficult to track data flow
- Hard to add new features

### Current Flow
\`\`\`
play.vue (many props)
├── PlayHeader (5 props, 5 events)
├── GuessFooter (7 props, 5 events)
├── ClueBar (3 props)
└── TransferTimelineCard (6 props)
\`\`\`

### Proposed Solution

Create Pinia store for game state:

\`\`\`typescript
// stores/gameStore.ts
export const useGameStore = defineStore('game', () => {
  // State
  const player = ref<Player | null>(null);
  const round = ref<Round | null>(null);
  const streak = ref(0);
  const bestStreak = ref(0);
  const confirmResetOpen = ref(false);
  // ... all shared state

  // Actions
  const loadPlayer = async () => { /* ... */ };
  const requestNewPlayer = () => { /* ... */ };
  const confirmNewPlayer = () => { /* ... */ };
  
  // Getters
  const currentName = computed(() => player.value?.name);
  const difficulty = computed(() => player.value?.difficulty);

  return {
    // State
    player, round, streak, bestStreak,
    // Actions
    loadPlayer, requestNewPlayer,
    // Getters
    currentName, difficulty,
  };
});
\`\`\`

### Benefits
- Single source of truth
- Cleaner component props
- Easier to debug
- Better testability
- Type-safe with TypeScript

### Implementation Steps
1. Install Pinia
2. Create store/gameStore.ts
3. Move state from composables to store
4. Update components to use store
5. Remove prop drilling
6. Update tests
7. Remove old composables if not used

### Files to Change
- nuxt.config.ts (add Pinia)
- stores/gameStore.ts (new)
- pages/play.vue (simplify imports)
- pages/won.vue (use store)
- composables/*.ts (refactor or remove)
- tests/*.test.ts (update)

### Acceptance Criteria
- [ ] Pinia store created
- [ ] All state moved to store
- [ ] Props drilling eliminated
- [ ] All tests passing
- [ ] Type safety maintained
- [ ] Code is cleaner and easier to understand

### Migration Path
- Phase 1: Add Pinia alongside existing composables
- Phase 2: Gradually migrate components
- Phase 3: Remove old composables

### Effort Estimate
- High (3-4 days)

### Related
- Issue #1 (usePlayGame refactor)
- Issue #??? (API service layer)
```

---

### Issue 6: Standardize API Route Patterns
```
Title: refactor(backend): standardize API route patterns and error handling
Labels: improvement, backend, refactor, api
Milestone: Phase 1
Assignee:
Priority: HIGH

## Description

### Problem
API routes have inconsistent patterns:

1. **Validation**
   - Some use Valibot with custom error handling
   - Some don't validate at all
   - No reusable validation schemas

2. **Error Handling**
   - Different error response formats
   - Some use sendError, others return error objects
   - Inconsistent HTTP status codes
   - No error codes enum

3. **Response Format**
   - Some return { data: {...} }
   - Some return raw data
   - No consistency

4. **Code Duplication**
   - Similar validation in multiple routes
   - Repeated error handling patterns
   - Duplicate JSON parsing

### Examples

\`\`\`typescript
// randomPlayer.ts
const parsed = parseSchema(object({ /* ... */ }), body);
if (!parsed.ok) {
  return sendError(event, createError({ statusCode: 400, ... }));
}

// submitScore.ts
const parsed = parseSchema(object({ /* ... */ }), body);
if (!parsed.ok) {
  return sendError(event, createError({ statusCode: 400, ... }));
}
// Same pattern repeated!
\`\`\`

### Proposed Solution

1. **Create API error codes enum**

\`\`\`typescript
// server/utils/api-errors.ts
export enum ApiErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  UNAUTHORIZED = "UNAUTHORIZED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
\`\`\`

2. **Create standardized error handler**

\`\`\`typescript
// server/utils/api-error-handler.ts
export function apiError(
  code: ApiErrorCode,
  message: string,
  statusCode: number = 400
) {
  return createError({
    statusCode,
    statusMessage: message,
    data: { code, message, timestamp: Date.now() },
  });
}
\`\`\`

3. **Create reusable validation schemas**

\`\`\`typescript
// server/schemas/common.ts
export const schemas = {
  roundId: pipe(string(), minLength(1), maxLength(128)),
  token: pipe(string(), minLength(1), maxLength(2048)),
  playerId: pipe(number(), minValue(1)),
};
\`\`\`

4. **Create response wrapper**

\`\`\`typescript
export function apiSuccess<T>(data: T) {
  return { success: true, data, timestamp: Date.now() };
}
\`\`\`

5. **Create route helper**

\`\`\`typescript
export function createApiHandler<T>(
  handler: (event: H3Event) => Promise<T>
) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event);
    } catch (err) {
      return sendError(event, handleRouteError(err));
    }
  });
}
\`\`\`

### Files to Change
- server/utils/api-errors.ts (new)
- server/utils/api-error-handler.ts (new)
- server/utils/api-response.ts (new)
- server/schemas/*.ts (new)
- server/api/*.ts (refactor all)

### Acceptance Criteria
- [ ] Error codes enum created
- [ ] All routes use consistent error handling
- [ ] All routes use consistent response format
- [ ] Validation schemas reusable
- [ ] All tests passing
- [ ] No code duplication

### Effort Estimate
- Medium (2-3 days)

### Related
- Issue #?? (Type definitions for API)
```

---

## MEDIUM PRIORITY ISSUES

### Issue 7: Accessibility - Keyboard Navigation
```
Title: fix(frontend): improve keyboard navigation and focus management
Labels: improvement, frontend, accessibility
Milestone: Phase 2
Assignee:
Priority: MEDIUM

## Description

### Problem
Keyboard users face issues:

1. **Focus management**
   - Modal dialogs don't trap focus
   - Focus not returned after modal closes
   - No visible focus indicators

2. **Keyboard shortcuts**
   - No way to access features via keyboard
   - Tab order not optimized
   - No keyboard shortcut hints

3. **Search/dropdown**
   - Arrow keys not supported
   - Enter/Escape not consistent

### Affected Components
- PlayHeader modal
- GuessFooter search
- All buttons

### Solution

1. **Implement focus trap for modals**

\`\`\`typescript
// utils/accessibility.ts
export function createFocusTrap(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, a, input, select'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  });
}
\`\`\`

2. **Add skip-to-content link**

\`\`\`vue
<!-- layouts/default.vue -->
<a href="#main-content" class="sr-only focus:not-sr-only">
  Skip to main content
</a>
\`\`\`

3. **Keyboard shortcuts**

\`\`\`typescript
// composables/useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  onMounted(() => {
    window.addEventListener('keydown', (e) => {
      if (e.key === '?') showHelpDialog();
      if (e.key === 'Enter') submitGuess();
      if (e.key === 'Escape') closeModal();
    });
  });
}
\`\`\`

### Acceptance Criteria
- [ ] Modal traps focus
- [ ] Tab order correct
- [ ] Skip link works
- [ ] Keyboard shortcuts documented
- [ ] Keyboard navigation tested

### Effort Estimate
- Medium (2 days)

### Related
- Issue #4 (ARIA labels)
- Issue #?? (Color contrast)
```

---

### Issue 8: Add Comprehensive Type Definitions for API
```
Title: refactor(backend): create centralized API type definitions
Labels: improvement, backend, type-safety, refactor
Milestone: Phase 1
Assignee:
Priority: MEDIUM

## Description

### Problem
API contract unclear between frontend and backend:

1. **Request types scattered**
   - Inline validation in routes
   - No single source of truth

2. **Response types inconsistent**
   - No documented response shape
   - Frontend assumes structure without verification
   - Easy to break on refactor

3. **Type safety missing**
   - Frontend can't validate response at compile time
   - API can't verify it returns expected shape

### Example

\`\`\`typescript
// server/api/guess.ts - response not documented
const result = {
  correct: boolean,
  score: number,
  breakdown: { /* ... */ },
  // What else?
};

// pages/play.vue - assumes structure
const res = await $fetch("/api/guess", { /* ... */ });
toast.add({ description: \`+\${res.breakdown.preStreak} points\` }); // ← Could break
\`\`\`

### Proposed Solution

Create centralized API types:

\`\`\`typescript
// types/api.ts
export namespace API {
  export namespace Guess {
    export interface Request {
      roundId: string;
      token: string;
      guess: string;
    }
    
    export interface Response {
      correct: boolean;
      score: number;
      breakdown: {
        base: number;
        multiplier: number;
        cluesUsed: number;
        preStreak: number;
        timeScore: number;
        streakBonus: number;
        finalScore: number;
      };
      streak: number;
      bestStreak: number;
      playerName: string;
    }
  }
  
  // Similar for other endpoints...
  export namespace SessionStats { /* ... */ }
  export namespace SubmitScore { /* ... */ }
}
\`\`\`

Usage:

\`\`\`typescript
// server/api/guess.ts
const body = await readBody<API.Guess.Request>(event);
const result: API.Guess.Response = {
  correct,
  score,
  breakdown,
  streak,
  bestStreak,
  playerName,
};

// pages/play.vue
const res = await $fetch<API.Guess.Response>("/api/guess", {
  method: "POST",
  body: data,
});
toast.add({ description: \`+\${res.breakdown.preStreak} points\` }); // ✓ Type-safe
\`\`\`

### Files to Change
- types/api.ts (new)
- server/api/*.ts (add type annotations)
- pages/play.vue (add type annotations)
- pages/won.vue (add type annotations)

### Acceptance Criteria
- [ ] All API routes have type definitions
- [ ] Frontend uses API types
- [ ] No any types in API usage
- [ ] All tests passing

### Effort Estimate
- Low-Medium (1-2 days)

### Related
- Issue #6 (Standardize API routes)
```

---

### Issue 9: Missing Database Indexes
```
Title: perf(backend): add missing database indexes
Labels: improvement, backend, performance
Milestone: Phase 1
Assignee:
Priority: MEDIUM

## Description

### Problem
Frequently-queried columns lack indexes:

1. **Player search**
   - `SELECT * FROM players WHERE name LIKE ?`
   - No index on name column

2. **Session queries**
   - `SELECT * FROM scores WHERE session_id = ?`
   - No index on session_id

3. **Round queries**
   - `SELECT * FROM rounds WHERE token = ?`
   - No index on token

### Performance Impact
- Full table scans on each query
- Slower as data grows
- High CPU usage

### Proposed Solution

\`\`\`sql
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_scores_session_id ON scores(session_id);
CREATE INDEX IF NOT EXISTS idx_rounds_token ON rounds(token);
CREATE INDEX IF NOT EXISTS idx_rounds_player_id ON rounds(player_id);
CREATE INDEX IF NOT EXISTS idx_transfers_player_id ON transfers(player_id);
CREATE INDEX IF NOT EXISTS idx_stats_player_id ON player_stats(player_id);
\`\`\`

### Files to Change
- server/db/schema.ts (add indexes)
- Add benchmark queries before/after

### Acceptance Criteria
- [ ] All indexes created
- [ ] Benchmarks show performance improvement
- [ ] Tests still passing

### Effort Estimate
- Low (1 day)

### Related
- None
```

---

### Issue 10: Implement Error Boundaries
```
Title: feat(frontend): add Vue error boundaries for crash protection
Labels: improvement, frontend, error-handling, reliability
Milestone: Phase 2
Assignee:
Priority: MEDIUM

## Description

### Problem
If any component throws an error, entire app crashes:

\`\`\`vue
<!-- If TransferTimelineCard throws, nothing renders -->
<TransferTimelineCard />

<!-- User sees: nothing, white screen, or console error only -->
\`\`\`

### Solution

Create error boundary component:

\`\`\`vue
<!-- components/ErrorBoundary.vue -->
<template>
  <div v-if="hasError" class="error-container">
    <h2>Something went wrong</h2>
    <p>{{ error.message }}</p>
    <button @click="reset">Try again</button>
  </div>
  <slot v-else />
</template>

<script setup>
const hasError = ref(false);
const error = ref<Error | null>(null);

onErrorCaptured((err, instance, info) => {
  hasError.value = true;
  error.value = err as Error;
  console.error("Error boundary caught:", err, info);
  return false; // Prevent further propagation
});

const reset = () => {
  hasError.value = false;
  error.value = null;
};
</script>

<style scoped>
.error-container {
  padding: 2rem;
  background: #fee;
  border: 1px solid #f00;
  border-radius: 0.5rem;
}
</style>
\`\`\`

Usage:

\`\`\`vue
<!-- pages/play.vue -->
<ErrorBoundary>
  <PlayHeader />
  <ClueBar />
  <TransferTimelineCard />
  <GuessFooter />
</ErrorBoundary>
\`\`\`

### Files to Change
- components/ErrorBoundary.vue (new)
- pages/play.vue (wrap)
- pages/won.vue (wrap)
- pages/index.vue (wrap)

### Acceptance Criteria
- [ ] Error boundary component created
- [ ] Used in all pages
- [ ] Graceful error display
- [ ] Recovery button works
- [ ] Tests verify error handling

### Effort Estimate
- Low (1 day)

### Related
- Issue #?? (Error handling consistency)
```

---

## LOW PRIORITY ISSUES

### Issue 11: Test Coverage Expansion
```
Title: test(all): expand test coverage to 50%+
Labels: improvement, testing, test-coverage
Milestone: Phase 3
Assignee:
Priority: MEDIUM

## Description

### Current State
- 13 tests
- ~15-20% code coverage
- Missing coverage:
  - Composables
  - API error paths
  - Database transactions
  - Scraper error handling
  - Rate limiting

### Target
- 70+ tests
- 50%+ code coverage

### Tests Needed

#### API Route Tests (30+ tests)
\`\`\`typescript
// tests/api/guess.test.ts
- Correct guess submission
- Incorrect guess submission
- Invalid input validation
- Rate limit exceeded
- Round already scored
- Round ownership validation
- Session not found

// tests/api/sessionStats.test.ts
- Valid session stats retrieval
- Missing session handling
- Leaderboard data inclusion
\`\`\`

#### Composable Tests (20+ tests)
\`\`\`typescript
// tests/composables/useGameSession.test.ts
- Load random player
- Load specific player
- Retry on failure

// tests/composables/useGameStreak.test.ts
- Persist streak to localStorage
- Load from storage
- Reset streak
\`\`\`

#### Integration Tests (15+ tests)
\`\`\`typescript
// tests/integration/game-flow.test.ts
- Load → Guess → Score → Results flow
- Streak calculation
- Leaderboard submission
\`\`\`

### Acceptance Criteria
- [ ] 70+ tests written
- [ ] 50%+ code coverage
- [ ] All test paths pass
- [ ] GitHub Actions CI/CD runs tests

### Effort Estimate
- High (5-7 days)

### Related
- All other issues (each needs tests)
```

---

### Issue 12: Security - Input Sanitization
```
Title: security: implement comprehensive input sanitization
Labels: improvement, security, backend, frontend
Milestone: Phase 2
Assignee:
Priority: MEDIUM

## Description

### Problem
User input could contain malicious content:

1. **Player name guess**
   - Stored in localStorage
   - Displayed in components
   - Vue escapes but be explicit

2. **Search input**
   - Sent to database
   - Could contain SQL

3. **Dev panel URL**
   - Sent to backend
   - Could contain malicious content

### Solution

\`\`\`typescript
// utils/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
\`\`\`

Usage:

\`\`\`typescript
// Sanitize on input
const sanitized = sanitizeText(userInput);
localStorage.setItem('guess', sanitized);

// Sanitize on backend
const cleanName = sanitizeText(body.guess);
\`\`\`

### Files to Change
- utils/sanitize.ts (new)
- composables/useGameSession.ts (use sanitize)
- composables/usePlayerSearch.ts (use sanitize)
- server/api/guess.ts (use sanitize)

### Acceptance Criteria
- [ ] DOMPurify integrated
- [ ] All user inputs sanitized
- [ ] XSS tests included

### Effort Estimate
- Low-Medium (1 day)

### Related
- None
```

---

### Issue 13: Documentation - JSDoc Comments
```
Title: docs: add comprehensive JSDoc comments
Labels: improvement, documentation, backend
Milestone: Phase 3
Assignee:
Priority: LOW

## Description

### Problem
Complex functions lack documentation:

1. **Difficulty calculation**
   - Algorithm not explained
   - Thresholds not documented

2. **Rate limiting**
   - Bucketing strategy unclear
   - Reset logic not documented

3. **Seeded random**
   - Seed formula not documented
   - Reproducibility not clear

### Solution

Add JSDoc to all complex functions:

\`\`\`typescript
/**
 * Calculate difficulty tier and multiplier for player
 * 
 * @param stats - Array of player competition appearances
 * @returns Difficulty object with tier and multiplier
 * 
 * @algorithm
 * 1. Sum appearances by competition type (International vs Top5)
 * 2. If international appearances >= 80 → ultra (2x)
 * 3. If international appearances >= 60 → hard (1.5x)
 * 4. If international appearances >= 45 → medium (1.25x)
 * 5. Otherwise → easy (1x)
 * 
 * @example
 * const difficulty = computeDifficulty([
 *   { competition_id: "CL", appearances: 10 },
 *   { competition_id: "GB1", appearances: 50 },
 * ]);
 * // Returns { tier: 'hard', multiplier: 1.5 }
 * 
 * @see difficulty.ts for constants
 */
export function computeDifficulty(stats: CompetitionStat[]): Difficulty {
  // ...
}
\`\`\`

### Files to Change
- server/utils/difficulty.ts
- server/utils/rate-limit.ts
- utils/seeded-random.ts
- server/utils/scoring.ts
- All complex composables

### Acceptance Criteria
- [ ] All exported functions documented
- [ ] Complex algorithms explained
- [ ] Examples provided
- [ ] Edge cases documented

### Effort Estimate
- Low (2-3 days)

### Related
- None
```

---

## FEATURE REQUESTS

### Issue 14: i18n Support - Internationalization
```
Title: feat: add i18n support for multiple languages
Labels: feature, frontend, backend, i18n
Milestone: Phase 3
Assignee:
Priority: LOW

## Description

### Opportunity
~150+ hard-coded English strings throughout app.

### Languages
Target European market:
- Spanish (23M+ speakers)
- French (18M+ speakers)
- German (18M+ speakers)
- Italian (15M+ speakers)
- Portuguese (12M+ speakers)

### Potential Impact
Each language could add 15-30% more users in that region.

### Solution

\`\`\`bash
npm install @nuxtjs/i18n
\`\`\`

Create translation files:

\`\`\`
locales/
  en.json
  es.json
  fr.json
  de.json
  it.json
  pt.json
\`\`\`

\`\`\`typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'it', name: 'Italiano' },
      { code: 'pt', name: 'Português' },
    ],
  },
});
\`\`\`

Frontend usage:

\`\`\`vue
<h1>{{ $t('game.title') }}</h1>
<p>{{ $t('game.description') }}</p>
\`\`\`

Backend usage:

\`\`\`typescript
// server/i18n/messages.ts
const messages = {
  en: { validation: { invalid_guess: 'Invalid guess' } },
  es: { validation: { invalid_guess: 'Adivinanza inválida' } },
};

// In routes
const locale = getHeader(event, 'accept-language')?.split('-')[0] ?? 'en';
return apiError('VALIDATION_ERROR', messages[locale].validation.invalid_guess);
\`\`\`

### Implementation Phases
1. Setup i18n framework
2. Extract strings to translations
3. Add language selector UI
4. Backend message translation
5. Test in each language

### Files to Change
- nuxt.config.ts
- locales/*.json (new)
- pages/*.vue (use $t())
- components/*.vue (use $t())
- server/i18n/messages.ts (new)
- server/api/*.ts (use $t())

### Acceptance Criteria
- [ ] i18n configured
- [ ] All UI text translated
- [ ] All 5 languages present
- [ ] Language selector works
- [ ] Backend returns localized messages

### Effort Estimate
- High (4-5 days)

### Benefits
- Reach international audience
- Competitive advantage
- Better user experience for non-English speakers

### Related
- None
```

---

## SUMMARY

Total Issues: 14

### By Priority
- Critical: 3
- High: 4
- Medium: 5
- Low: 2

### By Category
- Frontend: 7
- Backend: 5
- Testing: 1
- Documentation: 1

### Total Estimated Effort
- Phase 1 (Critical): 7-10 days
- Phase 2 (High/Medium): 10-14 days
- Phase 3 (Low/Feature): 8-12 days
- **Total: 25-36 days (5-7 weeks)**

---

## GitHub Import Instructions

1. Copy each issue (title + description)
2. Go to GitHub → Issues → New Issue
3. Paste content
4. Add labels from issue
5. Set milestone if applicable
6. Or use GitHub API:

\`\`\`bash
# Install gh CLI
brew install gh  # macOS
# or apt/choco for other OS

# Create issue
gh issue create --title "Issue Title" --body "Issue body" --label "improvement,frontend"
\`\`\`
