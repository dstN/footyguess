# Architecture & Technical Direction

> **Status**: Living Document  
> **Last Updated**: 2026-01-09  
> **Scope**: Nuxt 4 / Nuxt UI 4 — FootyGuess

This document defines the architectural intent, conventions, and guardrails for
the FootyGuess codebase. It is **normative**, not evaluative.

---

## 1. Architectural Intent

### 1.1 Core Goals

| Priority | Goal        | Rationale                                                                 |
| -------- | ----------- | ------------------------------------------------------------------------- |
| **P0**   | Stability   | A working game is more valuable than a perfect one                        |
| **P0**   | Clarity     | Code should be understandable without tribal knowledge                    |
| **P1**   | Simplicity  | Prefer explicit patterns over clever abstractions                         |
| **P1**   | Type Safety | TypeScript exists to catch errors at compile time, not to be circumvented |
| **P2**   | Testability | Critical paths (scoring, guessing) must remain testable                   |

### 1.2 Explicit Non-Goals

- **SSR optimization** — The app runs with `ssr: false` (SPA mode). This is
  intentional.
- **Multi-tenancy** — Single-instance SQLite is sufficient for the expected
  scale.
- **Real-time collaboration** — No WebSocket or push-based features are planned.
- **Mobile apps** — Web-only. No Capacitor/Electron wrappers.
- **Internationalization** — English-only at this time.

---

## 2. System Overview

### 2.1 High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT (SPA)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    pages/    │  │ components/  │  │ composables/ │       │
│  │  (routing)   │  │    (UI)      │  │   (state)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                            │                                │
│                      $fetch (REST)                          │
│           (with timeouts & unified logging)                 │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                         SERVER (Nitro)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   server/    │  │   server/    │  │   server/    │       │
│  │    api/      │  │  services/   │  │    utils/    │       │
│  │ (endpoints)  │  │  (business)  │  │  (shared)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                            │                                │
│                     better-sqlite3                          │
│  ┌─────────────────────────┴───────────────────────────┐    │
│  │                    server/db/                       │    │
│  │         SQLite + WAL mode + Auto-Cleanup            │    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   server/    │  │   server/    │  │   server/    │       │
│  │    api/      │  │  services/   │  │    utils/    │       │
│  │ (endpoints)  │  │  (business)  │  │  (shared)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                            │                                │
│                     better-sqlite3                          │
│  ┌─────────────────────────┴───────────────────────────┐    │
│  │                    server/db/                       │    │
│  │         SQLite + WAL mode + Auto-Cleanup            │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                │
│                     Security Layer                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   Headers Middleware  •  Rate Limiting  •  DLQ      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Client/Server Boundary

| Concern        | Handled By         | Notes                                    |
| -------------- | ------------------ | ---------------------------------------- |
| Routing        | `pages/`           | File-based, SPA mode                     |
| UI Rendering   | `components/`      | Nuxt UI 4 primitives                     |
| Client State   | `composables/`     | Reactive refs, orchestration             |
| Business Logic | `server/services/` | **All scoring, validation, persistence** |
| Data Access    | `server/db/`       | Single SQLite connection                 |
| External APIs  | `server/scraper/`  | External data ingestion (with DLQ)       |

**Key principle**: The client is a **presentation layer**. All authoritative
game state (scores, streaks, clue counts) lives server-side and is validated via
tokens.

### 2.3 Data Flow

```text
User Action → Composable → $fetch → API Route → Service → DB
                                         ↓
                              successResponse/errorResponse
                                         ↓
                              Composable updates refs
                                         ↓
                              Vue reactivity updates UI
```

---

## 3. Nuxt 4 Project Conventions

### 3.1 Server Route Structure

All API routes follow this pattern:

```typescript
// server/api/[name].ts
export default defineEventHandler(async (event) => {
  try {
    // 1. Parse & validate input (Valibot)
    const parsed = parseSchema(schema, body);
    if (!parsed.ok) return errorResponse(400, "Invalid input", event);

    // 2. Rate limiting (before expensive operations)
    const rateError = enforceRateLimit(event, { ... });
    if (rateError) return sendError(event, rateError);

    // 3. Authorization (token verification)
    const { sessionId } = verifyAndValidateRound(token, roundId);

    // 4. Business logic (via services)
    const result = someService.doThing(...);

    // 5. Response
    return successResponse(result, event);
  } catch (err) {
    return handleApiError(event, err, "context");
  }
});
```

### 3.2 Async & Side-Effect Handling

| Location           | Allowed Side Effects                          | Error Handling                    |
| ------------------ | --------------------------------------------- | --------------------------------- |
| `server/api/`      | None directly; delegate to services           | `handleApiError()`                |
| `server/services/` | DB writes, external calls                     | Throw `AppError` on known failure |
| `composables/`     | `$fetch`, `localStorage`, toast notifications | Try/catch, update `isError` refs  |
| `components/`      | None                                          | Emit to parent or use composable  |

### 3.3 Composable vs Utility

| Use a **Composable** (`composables/`) when... | Use a **Utility** (`utils/`) when... |
| --------------------------------------------- | ------------------------------------ |
| You need Vue reactivity (refs, computed)      | The function is pure                 |
| You need lifecycle hooks (onMounted, watch)   | No Vue dependency required           |
| State must be shared across components        | Stateless transformation/validation  |
| You're orchestrating other composables        | Simple formatting, calculation       |

**Example**:

- `useGameSession` — composable (manages reactive session state)
- `scoring-constants.ts` — utility (pure constants)
- `sanitize.ts` — utility (pure string transformation)

---

## 4. Nuxt UI 4 Usage Guidelines

### 4.1 Component Composition

- **Use Nuxt UI components directly** — `UButton`, `UModal`, `UInput`, etc.
- **Do not wrap Nuxt UI components** just to add default props. Use the
  `app.config.ts` theme system instead.
- **Slots and props are the API** — Avoid reaching into component internals.

### 4.2 Styling Boundaries

| Allowed                               | Forbidden                                       |
| ------------------------------------- | ----------------------------------------------- |
| Tailwind utility classes              | Overriding Nuxt UI internal CSS                 |
| Theme colors via `app.config.ts`      | Deep selector targeting (`.u-modal >>> .inner`) |
| Animation classes in `animations.css` | `!important` on Nuxt UI elements                |
| Custom components for non-UI concerns | Wrapping `UButton` as `MyButton`                |

### 4.3 What Is Intentionally Not Abstracted

These are used **directly** without wrapper components:

- `UButton`, `UModal`, `UInput`, `UToast`
- `UIcon` (via Lucide icons: `i-lucide-*`)
- Form validation via Nuxt UI's `<UForm>` + Valibot schemas

---

## 5. TypeScript Standards

### 5.1 Typing Philosophy

| Principle                                  | Practice                                      |
| ------------------------------------------ | --------------------------------------------- |
| **Strict mode enabled**                    | `typescript: { strict: true }` in nuxt.config |
| **Explicit over inferred** for public APIs | Service functions have explicit return types  |
| **Inferred for implementation details**    | Local variables, intermediate values          |
| **No `any` in application code**           | Scraper files are a known exception (see §8)  |

### 5.2 Error & Return Contracts

**API Routes** return `ApiResponse<T>`:

```typescript
interface ApiResponse<T = unknown> {
  requestId: string;
  timestamp: string;
  statusCode: number;
  success: boolean;
  data: T | null;
  error?: string;
  details?: Record<string, unknown>; // Dev only
}
```

**Services** return typed data or throw:

```typescript
// Good: explicit return type
function getRound(roundId: string): RoundData | undefined { ... }

// Good: throws on failure, caller handles
function verifyAndValidateRound(token: string, roundId: string): { sessionId: string; payload: RoundPayload }
```

**Composables** return typed state objects:

```typescript
function useGameSession() {
  const sessionId = ref<string | null>(null);
  // ...
  return { sessionId, player, round, isLoading, loadPlayer };
}
```

---

## 6. Error Handling & Observability

### 6.1 Error Hierarchy

| Layer          | Error Handling Strategy                                          |
| -------------- | ---------------------------------------------------------------- |
| **DB/Service** | Throw `AppError` for logic failures; standard Error for crashes  |
| **API Route**  | Catch via `handleApiError()`, which logs and formats response    |
| **Composable** | Catch, set `isError` ref, show toast, log to console             |
| **Component**  | Should not catch; propagate to composable or use `ErrorBoundary` |

### 6.2 Logging Expectations

**Server-side**: Use the structured logger (`server/utils/logger.ts`):

```typescript
import { logError, logInfo } from "../utils/logger.ts";

logError("guess", "Token verification failed", error, { roundId });
logInfo("round", "New round created", { sessionId, playerId });
```

**Client-side**: Use the unified client logger (`utils/client-logger.ts`):

```typescript
import { logError, logInfo } from "~/utils/client-logger";

logError("useGameSession", "Failed to load player", err);
```

### 6.3 What Is Allowed to Fail

| Failure Mode        | Response                        |
| ------------------- | ------------------------------- |
| Invalid user input  | 400 + user-friendly message     |
| Rate limit exceeded | 429 + backoff hint              |
| Round expired       | 410 + prompt to start new round |
| Player not found    | 404 + suggest search            |
| Token invalid       | 401 + session refresh           |
| **DB corruption**   | 500 + crash (unrecoverable)     |
| Missing env config  | Crash at startup (fail fast)    |

### 6.4 Health & Monitoring

- **Health Check**: `/api/health` monitors DB connectivity
- **Security Headers**: Standardized headers via middleware
- **Rate Limiting**: Enforced on all public endpoints

---

## 7. Performance & Scalability Posture

### 7.1 Current Priorities

- **Client bundle size** — Vite chunking enabled, vendor split
- **DB query efficiency** — Indexes on frequently queried columns
- **Rate limiting** — IP and session-based to prevent abuse
- **WAL mode** — SQLite configured for concurrent reads
- **Robustness** — Client side timeouts, dead letter queues, and session cleanup

### 7.2 Deferred Concerns

| Concern                    | Status             | Reference         |
| -------------------------- | ------------------ | ----------------- |
| Lazy DB initialization     | Accepted trade-off | Issue #74         |
| Production-grade analytics | Deferred           | No immediate need |

---

## 8. Known Tensions & Open Issues

### 8.1 Intentional Technical Debt

| Issue                             | Category    | Decision                                                              |
| --------------------------------- | ----------- | --------------------------------------------------------------------- |
| **#98**: Scraper uses `any` types | TypeScript  | Accepted. Scraper is isolated, external API shapes are unstable.      |
| **#74**: Sync DB init             | Performance | Accepted. Simplicity > serverless cold-start optimization.            |
| **#110**: DB type assertions      | TypeScript  | Accepted for now. Runtime validation adds overhead; schema is stable. |

---

## 9. Anti-Patterns & Guardrails

### 9.1 Forbidden Patterns

| Pattern                                       | Why It's Forbidden                |
| --------------------------------------------- | --------------------------------- |
| `any` in application code (non-scraper)       | Defeats TypeScript; hides bugs    |
| Direct DB access from API routes              | Bypasses service layer validation |
| Mutating props in components                  | Vue anti-pattern; causes bugs     |
| `!important` in CSS                           | Breaks Nuxt UI theming            |
| `eval()` or `Function()` constructors         | Security risk                     |
| Committing `.env` files                       | Credential exposure               |
| `// @ts-ignore` without justification comment | Silent type hole                  |

### 9.2 Allowed With Justification

| Pattern                      | When Acceptable                                                  |
| ---------------------------- | ---------------------------------------------------------------- |
| Type assertions (`as T`)     | After parsing (parseSchema) or for DB results with stable schema |
| `console.log` in client code | **Only during development debugging**; use `logInfo` otherwise   |
| Inline styles                | One-off animations or dynamic values only                        |
| Direct localStorage access   | Only in composables, with try/catch for private browsing         |

---

## 10. Decision Rules

### Quick Reference

| If...                       | Then...                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| Adding server-side logic    | Put it in `server/services/`, not in API route                    |
| Adding client state         | Create or extend a composable                                     |
| Adding pure functions       | Put in `utils/` (client) or `server/utils/`                       |
| Adding UI                   | Use Nuxt UI components directly                                   |
| Adding validation           | Use Valibot; server uses `parseSchema()`                          |
| Adding an API endpoint      | Follow the 5-step pattern in §3.1                                 |
| Catching errors server-side | Use `logError()` + `errorResponse()`                              |
| Catching errors client-side | Use `logError()` + update `isError` ref + show toast              |
| Typing a function return    | Explicit if public API, inferred if internal                      |
| Modifying scoring logic     | Update `server/utils/scoring.ts` AND `utils/scoring-constants.ts` |

### Absolute Rules

1. **Never trust client-provided data** — Always validate server-side.
2. **Never store secrets in code** — Use environment variables.
3. **Never skip rate limiting** — Every public endpoint must be protected.
4. **Never mutate shared refs directly** — Use computed or wrapper functions.
5. **Never use `@ts-ignore` without a comment explaining why**.
6. **Never wrap Nuxt UI components just to change defaults** — Use theme config.

---

## Appendix A: Directory Purpose Reference

| Directory          | Purpose                                          | Owner  |
| ------------------ | ------------------------------------------------ | ------ |
| `pages/`           | Route definitions                                | Client |
| `components/`      | Reusable UI                                      | Client |
| `composables/`     | Reactive state & logic                           | Client |
| `utils/`           | Pure utilities                                   | Client |
| `assets/css/`      | Global styles                                    | Client |
| `layouts/`         | Page wrappers                                    | Client |
| `server/api/`      | HTTP endpoints                                   | Server |
| `server/services/` | Business logic (`player.ts`, `session.ts`, etc.) | Server |
| `server/utils/`    | Server utilities (`errors.ts`, `scoring.ts`)     | Server |
| `server/db/`       | Database access                                  | Server |
| `server/scraper/`  | Data ingestion                                   | Server |
| `types/`           | Shared TypeScript types                          | Both   |

---

## Appendix B: LLM Context Files

The `.llm/` directory contains framework documentation for AI assistants:

- `.llm/nuxt/llms.txt` — Nuxt 4 documentation summary
- `.llm/nuxtui/llms.txt` — Nuxt UI 4 documentation summary

**These files override general framework knowledge** when working with AI tools.

---

## Changelog

| Date       | Change                                          |
| ---------- | ----------------------------------------------- |
| 2026-01-09 | Updated: Resolved all major tech debt issues    |
| 2026-01-10 | Added Service Layer, AppError, Security Headers |
| 2026-01-09 | Updated: Resolved all major tech debt issues    |
| 2026-01-07 | Initial architecture document created           |
