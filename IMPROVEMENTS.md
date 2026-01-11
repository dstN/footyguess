# Improvements Roadmap

> **Status**: Living Document **Last Updated**: 2026-01-12 **Scope**: FootyGuess
> Future Enhancements (with reconciliation status markers)

This document outlines potential improvements for code stability, game logic,
frontend experience, and developer experience. Items are categorized by priority
and effort.

All improvements should follow the guidelines in
[ARCHITECTURE.md](ARCHITECTURE.md).

---

## Table of Contents

1. [Code Stability](#1-code-stability)
2. [Game Logic Enhancements](#2-game-logic-enhancements)
3. [Frontend/UX Improvements](#3-frontendux-improvements)
4. [Developer Experience](#4-developer-experience)
5. [Performance Optimizations](#5-performance-optimizations)
6. [Future Features](#6-future-features)

---

## 1. Code Stability

### 1.1 Service Layer Completion ✅ DONE

**Priority**: P1 | **Effort**: Large | **Category**: Architecture

Service layer is now complete. All API routes delegate business logic to service
functions.

**Current State** (as of 2026-01-12):

```
server/services/
├── clue.ts          # ✅ useClue
├── guess.ts         # ✅ processGuess
├── round.ts         # ✅ verifyAndValidateRound, getRound
├── player.ts        # ✅ getPlayer, searchPlayers, getRandomPlayer
├── leaderboard.ts   # ✅ getLeaderboard, submitScore functions
├── session.ts       # ✅ getSessionStats
├── request.ts       # ✅ getRequestStatus
└── index.ts         # ✅ Exports all services
```

**Completed Work**:

- ✅ `submitScore.ts` now uses leaderboard service functions
- ✅ All services properly exported from `index.ts`
- ✅ Validation middleware fixed to match actual endpoint schemas

---

### 1.2 TypeScript Strictness ✅ DONE

**Priority**: P2 | **Effort**: Medium | **Category**: Type Safety

**Areas to Improve**:

1. **Eliminate `any` in application code**

   ```typescript
   // Before
   function parsePlayer(data: any): Player { ... }

   // After
   interface RawPlayerData {
     id?: number;
     name?: string;
     // ... define shape
   }
   function parsePlayer(data: unknown): Player {
     const validated = parseRawPlayer(data); // Valibot validation
     return transformToPlayer(validated);
   }
   ```

2. **Add explicit return types to public functions**

   ```typescript
   // Before
   export function calculateScore(params) { ... }

   // After
   export function calculateScore(params: ScoreParams): ScoreResult { ... }
   ```

3. **Replace type assertions with type guards**

   ```typescript
   // Before
   const player = result as Player;

   // After
   if (isPlayer(result)) {
     // TypeScript knows result is Player
   }
   ```

**Files Needing Attention**:

- `server/utils/player-parser.ts`
- `server/middleware/validation.ts`
- `server/api/getPlayer.ts`
- `composables/useClueData.ts`
- `composables/useTransferTimeline.ts`

---

### 1.3 Error Handling Standardization ✅ DONE

**Priority**: P2 | **Effort**: Medium | **Category**: Reliability

**Current Issues**:

- Mixed use of `setResponseStatus()` and `errorResponse()`
- Some endpoints return raw data, others use `successResponse()`
- Inconsistent error logging patterns

**Improvement**: Create error handling utilities

```typescript
// server/utils/error-handler.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function handleApiError(event: H3Event, error: unknown) {
  if (error instanceof AppError) {
    logError(error.code, error.message, error, error.details);
    return errorResponse(error.statusCode, error.message, event);
  }

  logError("unhandled", "Unexpected error", error);
  return errorResponse(500, "Internal server error", event);
}
```

---

### 1.4 Test Coverage Expansion ✅ DONE

**Priority**: P1 | **Effort**: Large | **Category**: Testing

**Critical Missing Tests** (per ARCHITECTURE.md):

| File            | Required Tests                           | Priority |
| --------------- | ---------------------------------------- | -------- |
| `scoring.ts`    | All scoring calculations                 | **P0**   |
| `difficulty.ts` | Tier calculations, downgrade rules       | P1       |
| `token.ts`      | Token creation, verification, expiration | P1       |

**Recommended Test Structure**:

```typescript
// tests/scoring.test.ts
describe('calculateScore', () => {
  describe('base scoring', () => {
    it('returns 100 for easy player with no clues', () => { ... });
    it('applies difficulty multiplier correctly', () => { ... });
  });

  describe('clue penalties', () => {
    it('deducts 10 points per clue', () => { ... });
    it('never goes below minimum score', () => { ... });
  });

  describe('time bonus', () => {
    it('gives max bonus for instant guess', () => { ... });
    it('gives penalty for slow guess', () => { ... });
    it('handles boundary values correctly', () => { ... });
  });

  // ... more test cases
});
```

**Additional Testing Improvements**:

- Add integration tests for full game flow
- Create typed test fixtures (no `as unknown as Player`)
- Centralize `$fetch` mock in test setup
- Add negative test cases (error paths)

---

## 2. Game Logic Enhancements

### 2.1 Clue System Improvements ❌ NOT DONE

**Priority**: P2 | **Effort**: Medium | **Category**: Game Logic

**Potential New Clue Types**:

| Clue Type              | Description                    | Implementation Notes                |
| ---------------------- | ------------------------------ | ----------------------------------- |
| **Career Highlight**   | "Won Champions League in 2015" | Requires trophy data                |
| **Teammate**           | "Played with [Famous Player]"  | Complex: needs player relationships |
| **Manager**            | "Played under [Manager]"       | Requires manager data               |
| **Jersey Number**      | "Wore #7 at [Club]"            | Requires historical jersey data     |
| **Transfer Fee Range** | "Cost €30-50M"                 | Already have transfer data          |

**Implementation**:

1. Add clue key to `ClueKey` type in `useClueData.ts`
2. Implement extraction in `cluePool` computed
3. Add UI rendering in `ClueBar.vue`
4. Update tests

---

### 2.2 Scoring System Refinements ❌ NOT DONE

**Priority**: P3 | **Effort**: Small | **Category**: Game Logic

**Potential Improvements**:

1. **Progressive Clue Costs**

   - First clue: 5 points
   - Later clues: 15 points
   - Encourages strategic clue usage

2. **Hint Types with Different Costs**

   - Biographical clues: 5 points
   - Career stats: 10 points
   - Transfer history: 15 points

3. **Guess Quality Bonus**
   - Partial match detection ("Ronaldo" for "Cristiano Ronaldo")
   - Suggestion system before full guess

**Important**: Any scoring changes must:

- Update `server/utils/scoring.ts` (source of truth)
- Update `utils/scoring-constants.ts` (client display)
- Update `HelpModal.vue` (user documentation)
- Add/update tests

---

### 2.3 Difficulty Selection System ✅ DONE (v1.3.0)

**Priority**: P1 | **Effort**: Medium | **Category**: Game Logic

**Implementation**:

- User-selectable difficulty before game start
- Options: Default (random E/M/H), Easy, Medium, Hard, Ultra
- New multipliers: 1×, 2×, 3×, 4× (was 1×, 1.25×, 1.5×, 2×)
- Max base scores: 100, 200, 300, 400 pts

**Files Changed**:

- `types/player.ts` - Added `UserSelectedDifficulty`, `GameMode` types
- `utils/scoring-constants.ts` - Updated multipliers
- `server/utils/difficulty.ts` - Updated multipliers
- `server/services/player.ts` - `getRandomPlayer({ tierFilter })`
- `server/api/randomPlayer.ts` - `?difficulty=X` query param
- `components/DifficultySelector.vue` - New modal component
- `components/PlayHeader.vue` - Two-step new game flow
- `composables/useGameSession.ts` - Difficulty option in loadPlayer
- `composables/usePlayGame.ts` - Query param handling
- `composables/usePlayerReset.ts` - Difficulty param in confirm

**Future Enhancements** (P3):

1. **Additional Difficulty Factors**

   - Years since retirement (retired players harder)
   - National team prominence
   - Social media following (if available)

2. **Dynamic Difficulty Adjustment**

   - Adjust based on player streak
   - Option for "Hard Mode" with only Hard/Ultra players

3. **Difficulty Categories**
   - "Legends" - retired icons
   - "Current Stars" - active top players
   - "Rising Stars" - young talents
   - "Cult Heroes" - less famous but notable

---

### 2.4 Loss Mechanics & Wrong Guess Penalty ✅ DONE (v1.4.0)

**Priority**: P1 | **Effort**: Medium | **Category**: Game Logic

**Implementation**:

- Wrong guess penalty increased from -2% to -10% per guess
- Maximum 5 wrong guesses allowed (6th = instant loss)
- Three distinct loss states: win, surrender, aborted
- Difficulty persistence across rounds via localStorage

**Files Changed**:

- `utils/scoring-constants.ts` - `MAX_WRONG_GUESSES = 5`, updated malice penalty
- `server/utils/scoring.ts` - Updated malice calculation
- `server/services/guess.ts` - Abort logic for 6th wrong guess
- `server/api/guess.ts` - Returns abort fields
- `composables/useGuessSubmission.ts` - `onAborted` callback, abort handling
- `composables/usePlayGame.ts` - Difficulty persistence, abort handling
- `components/PlayHeader.vue` - Fixed give-up disabled state
- `pages/won.vue` - Distinct UI for win/surrender/aborted
- `components/HelpModal.vue` - Updated wrong guess documentation
- `pages/index.vue` - Updated scoring row
- `components/VictoryCard.vue` - Difficulty persistence on "New mystery"

**Fixes Addressed**:

1. ✅ Difficulty lost on "New Mystery" navigation
2. ✅ Give-up blocked after revealing all clues
3. ✅ Wrong guess penalty too lenient (-2%)
4. ✅ No distinct losing state for surrender vs. abort

---

### 2.5 Streak System Enhancements ❌ NOT DONE

**Priority**: P3 | **Effort**: Small | **Category**: Game Logic

**Current System**:

- Simple increment/reset
- Bonus multiplier at thresholds

**Potential Improvements**:

1. **Streak Milestones**

   - Visual celebration at 10, 25, 50, 100
   - Unlock achievements/badges

2. **Streak Recovery**

   - "Second Chance" mechanic (once per session)
   - Costs accumulated points

3. **Weekly/Daily Streaks**
   - Track consecutive days played
   - Bonus for daily engagement

---

## 3. Frontend/UX Improvements

### 3.1 Accessibility Enhancements 🟡 PARTIALLY DONE

**Priority**: P2 | **Effort**: Medium | **Category**: Accessibility

**Current State**: Good foundation with ARIA labels, focus management, skip
links

**Improvements**:

1. **Keyboard Navigation**

   - Full keyboard support for all interactions
   - Visible focus indicators on all interactive elements
   - Escape key to close modals (verify working)

2. **Screen Reader Optimization**

   - Announce clue reveals
   - Announce score changes
   - Better game state descriptions

3. **Reduced Motion Support**

   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

4. **Color Contrast**
   - Audit all color combinations
   - Ensure 4.5:1 ratio for text
   - Don't rely on color alone for information

---

### 3.2 Mobile Experience 🟡 PARTIALLY DONE

**Priority**: P2 | **Effort**: Medium | **Category**: UX

**Current State**: Responsive via Tailwind, but not mobile-optimized

**Improvements**:

1. **Touch Interactions**

   - Larger touch targets (44x44px minimum)
   - Swipe gestures for clue reveal
   - Pull-to-refresh for new player

2. **Mobile Layout Optimization**

   - Collapsible clue panel
   - Fixed bottom action bar
   - Full-screen modals

3. **Performance on Mobile**

   - Reduce initial bundle for slow networks
   - Optimize images (if any added)
   - Test on low-end devices

4. **Footer Improvements**
   - Improve current Footer Links
   - maybe Add social links
   - ? privacy policy link
   - ? terms of service link

---

### 3.3 Visual Feedback Enhancements ❌ NOT DONE

**Priority**: P3 | **Effort**: Small | **Category**: UX

**Potential Improvements**:

1. **Score Animation**

   - Animated counter when score changes
   - Visual breakdown of score components
   - Confetti or celebration on high scores

2. **Clue Reveal Animation**

   - Card flip or fade-in effect
   - Sound effects (optional, mutable)

3. **Loading States**

   - Skeleton loaders for all async content
   - Progress indication for searches

4. **Error States**
   - Friendly error illustrations
   - Clear recovery actions
   - Retry buttons with exponential backoff

---

### 3.4 Game State Persistence 🟡 PARTIALLY DONE

**Priority**: P2 | **Effort**: Medium | **Category**: UX

**Current State**: Session persists, difficulty persists across rounds (v1.4.0)

**Completed** (v1.4.0):

- ✅ Difficulty selection persists in localStorage
- ✅ "New mystery" reads difficulty from localStorage

**Remaining Improvements**:

1. **Resume Interrupted Game**

   - Store current round state in localStorage
   - Prompt to resume on return
   - Handle expired rounds gracefully

2. **Offline Support**
   - Service worker for static assets
   - Graceful degradation when offline
   - Sync when back online

---

### 3.5 Social Features ❌ NOT DONE

**Priority**: P3 | **Effort**: Large | **Category**: Feature

**Potential Features**:

1. **Share Results**

   - Generate shareable image/text
   - "I guessed [Player] in X clues!"
   - Social media sharing buttons

2. **Challenge Friends**

   - Generate challenge link with specific player
   - Compare scores on same player

3. **Global Leaderboard Improvements**
   - Daily/weekly leaderboards
   - Filter by difficulty tier
   - Player profile pages

---

### 3.6 SEO Optimizations ✅ DONE

**Priority**: P3 | **Effort**: Small | **Category**: SEO

**Current State**: Basic meta tags, no sitemap

**Improvements**:

1. **Meta Tags**

   - Dynamic title and description
   - OpenGraph tags for social sharing
   - Canonical URLs

2. **Sitemap Generation**

   - Generate sitemap.xml
   - Submit to search engines

3. **Robots.txt**
   - Properly configured
   - Dynamic rules for different environments

---

## 4. Developer Experience

### 4.1 Development Tooling 🟡 PARTIALLY DONE

**Priority**: P2 | **Effort**: Small | **Category**: DX

**Improvements**:

1. **Git Hooks**

   ```bash
   # .husky/pre-commit
   npm run lint
   npm run typecheck
   npm test -- --run
   ```

2. **VS Code Configuration**

   - Recommended extensions
   - Debug configurations
   - Task definitions

3. **Development Scripts**
   ```json
   {
     "scripts": {
       "dev:debug": "node --inspect node_modules/.bin/nuxt dev",
       "db:seed": "tsx scripts/seed-dev-data.ts",
       "db:reset": "tsx scripts/reset-db.ts"
     }
   }
   ```

---

### 4.2 Documentation Improvements ❌ NOT DONE

**Priority**: P3 | **Effort**: Medium | **Category**: DX

**Potential Documentation**:

1. **API Documentation**

   - OpenAPI/Swagger spec for all endpoints
   - Request/response examples
   - Error code reference

2. **Component Storybook**

   - Visual component library
   - Interactive prop playground
   - Accessibility testing integration

3. **Architecture Decision Records (ADRs)**
   - Document major decisions
   - Context, decision, consequences
   - Help future contributors understand "why"

---

### 4.3 Debugging Improvements ❌ NOT DONE

**Priority**: P2 | **Effort**: Small | **Category**: DX

**Current State**: DevPanel exists for development

**Improvements**:

1. **Enhanced DevPanel**

   - View current round state
   - View all available clues
   - Reset to specific game states
   - Performance metrics

2. **Request Tracing**
   - Correlation IDs in all logs
   - Client-side request timing
   - API response time display

---

## 5. Performance Optimizations

### 5.1 Database Query Optimization ❌ NOT DONE

**Priority**: P2 | **Effort**: Medium | **Category**: Performance

**Potential Improvements**:

1. **Query Analysis**

   - Run `EXPLAIN QUERY PLAN` on all queries
   - Identify missing indexes
   - Optimize JOIN patterns

2. **Prepared Statement Caching**

   - Pre-compile frequent queries
   - Reuse prepared statements

3. **Connection Pooling** (if scaling beyond single instance)
   - Consider D1 or PostgreSQL for multi-instance

---

### 5.2 Client Bundle Optimization ❌ NOT DONE

**Priority**: P2 | **Effort**: Small | **Category**: Performance

**Current State**: Vite chunking enabled, vendor split

**Improvements**:

1. **Lazy Loading**

   - Lazy load modals (HelpModal, HighscoreModal)
   - Lazy load victory page components

2. **Tree Shaking Verification**

   - Audit unused exports
   - Remove dead code

3. **Image Optimization** (if images added)
   - WebP format
   - Responsive images
   - Lazy loading

---

### 5.3 Caching Strategies ❌ NOT DONE

**Priority**: P3 | **Effort**: Medium | **Category**: Performance

**Potential Implementations**:

1. **API Response Caching**

   - Cache leaderboard for 1 minute
   - Cache player search results

2. **Static Asset Caching**

   - Long cache for versioned assets
   - Service worker for offline support

3. **Database Query Caching**
   - In-memory cache for frequent queries
   - Invalidation strategy

---

## 6. Future Features

### 6.1 Game Modes ❌ NOT DONE

**Priority**: P3 | **Effort**: Large | **Category**: Feature

**Potential Modes**:

1. **Time Attack**

   - Guess as many players as possible in 5 minutes
   - Simplified clue set for speed

2. **Career Mode**

   - Progress through difficulty tiers
   - Unlock harder players
   - Achievements system

3. **Versus Mode**

   - Real-time competition
   - Same player, race to guess
   - WebSocket integration required

4. **Daily Challenge**
   - Same player for everyone
   - One attempt per day
   - Global leaderboard

---

### 6.2 Content Expansion ❌ NOT DONE

**Priority**: P3 | **Effort**: Large | **Category**: Content

**Potential Expansions**:

1. **Historical Players**

   - Legends from 1990s, 1980s, etc.
   - Different clue types (no transfer data)

2. **Women's Football**

   - Separate player database
   - Same game mechanics

3. **Regional Focus**
   - Filter by league/country
   - "Premier League Only" mode

---

### 6.3 Monetization Options ❌ NOT DONE

**Priority**: P4 | **Effort**: Large | **Category**: Business

**If monetization needed**:

1. **Premium Features**

   - Ad-free experience
   - Exclusive game modes
   - Detailed statistics

2. **Cosmetics**

   - Themes
   - Profile customization
   - Achievement badges

3. **Non-Intrusive Ads**
   - Between rounds only
   - Respect user experience

---

## Status Summary (Reconciliation Audit 2026-01-13)

| Section                 | Done  | Partial | Not Done |
| ----------------------- | ----- | ------- | -------- |
| 1. Code Stability       | 4     | 0       | 0        |
| 2. Game Logic           | 2     | 0       | 3        |
| 3. Frontend/UX          | 1     | 3       | 2        |
| 4. Developer Experience | 0     | 1       | 2        |
| 5. Performance          | 0     | 0       | 3        |
| 6. Future Features      | 0     | 0       | 3        |
| **Total**               | **7** | **4**   | **13**   |

---

## Priority Matrix

| Priority | Category     | Items                                    | Status         |
| -------- | ------------ | ---------------------------------------- | -------------- |
| **P0**   | Testing      | Scoring tests                            | ✅ DONE        |
| **P1**   | Architecture | Service layer, TypeScript strictness     | 🟡 Partial     |
| **P1**   | Testing      | Difficulty tests, token tests            | ✅ DONE        |
| **P2**   | Stability    | Error handling, response standardization | ✅ DONE        |
| **P2**   | UX           | Accessibility, mobile, game persistence  | 🟡 Partial     |
| **P2**   | DX           | Tooling, debugging                       | 🟡 Partial     |
| **P3**   | Game Logic   | Clue improvements, scoring refinements   | ❌ Not Started |
| **P3**   | UX           | Visual feedback, social features         | ❌ Not Started |
| **P3**   | Features     | Game modes, content expansion            | ❌ Not Started |

---

## Implementation Guidelines

When implementing any improvement:

1. **Follow ARCHITECTURE.md** - All code must adhere to established patterns
2. **Test First** - Critical paths must have tests
3. **Document Changes** - Update README/ARCHITECTURE if patterns change
4. **Incremental Delivery** - Small PRs over large rewrites
5. **Measure Impact** - Performance changes need before/after metrics

---

## Changelog

| Date       | Change                                         |
| ---------- | ---------------------------------------------- |
| 2026-01-11 | Reconciliation: Corrected service layer status |
