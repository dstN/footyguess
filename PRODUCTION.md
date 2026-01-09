# Production Readiness Plan

> **Status**: Pre-Production Checklist **Last Updated**: 2026-01-09 **Scope**:
> FootyGuess Production Deployment

This document outlines all considerations, requirements, and action items to
make FootyGuess production-ready.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Critical Blockers](#2-critical-blockers)
3. [Infrastructure Requirements](#3-infrastructure-requirements)
4. [Security Checklist](#4-security-checklist)
5. [Performance Optimization](#5-performance-optimization)
6. [Monitoring & Observability](#6-monitoring--observability)
7. [Database Operations](#7-database-operations)
8. [Deployment Pipeline](#8-deployment-pipeline)
9. [Legal & Compliance](#9-legal--compliance)
10. [Launch Checklist](#10-launch-checklist)

---

## 1. Current State Assessment

### What's Ready ✅

| Area                | Status     | Notes                                         |
| ------------------- | ---------- | --------------------------------------------- |
| Core Game Logic     | ✅ Ready   | Scoring, difficulty, streak systems working   |
| Client Architecture | ✅ Ready   | Clean composable pattern, Nuxt UI integration |
| Server Architecture | ⚠️ Partial | Service layer exists but not fully utilized   |
| Database Schema     | ✅ Ready   | SQLite with WAL mode, proper indexes          |
| Authentication      | ✅ Ready   | JWT-like round tokens, session validation     |
| Rate Limiting       | ⚠️ Partial | Implemented but missing on some endpoints     |
| Error Handling      | ✅ Ready   | Structured logging, standardized responses    |
| Testing             | ⚠️ Partial | Missing critical scoring tests                |

### What's Missing ❌

- Production-grade monitoring
- Backup/restore procedures
- Health check endpoints
- Proper secrets management
- SSL/TLS configuration guide
- Load testing results
- Disaster recovery plan

---

## 2. Critical Blockers

These MUST be resolved before production deployment:

### 2.1 Security Blockers

| Issue                                     | Priority | Effort | Reference  |
| ----------------------------------------- | -------- | ------ | ---------- |
| Missing rate limiting on 6 endpoints      | **P0**   | 2h     | Issue #119 |
| Add tests for token.ts security functions | **P1**   | 3h     | Issue #126 |

### 2.2 Testing Blockers

| Issue                       | Priority | Effort | Reference  |
| --------------------------- | -------- | ------ | ---------- |
| Add tests for scoring.ts    | **P0**   | 4h     | Issue #117 |
| Add tests for difficulty.ts | **P1**   | 2h     | Issue #125 |

### 2.3 Architecture Blockers

| Issue                             | Priority | Effort | Reference  |
| --------------------------------- | -------- | ------ | ---------- |
| Direct DB access in API routes    | **P1**   | 8h     | Issue #118 |
| Standardize API response patterns | **P2**   | 3h     | Issue #124 |

---

## 3. Infrastructure Requirements

### 3.1 Server Requirements

```yaml
Minimum Recommended:
  CPU: 2 vCPU
  RAM: 2 GB
  Storage: 20 GB SSD
  OS: Ubuntu 22.04 LTS / Debian 12

Production Recommended:
  CPU: 4 vCPU
  RAM: 4 GB
  Storage: 50 GB SSD (for logs + DB growth)
  OS: Ubuntu 22.04 LTS / Debian 12
```

### 3.2 Node.js Environment

```yaml
Runtime:
  Node.js: 20.x LTS (required)
  npm: 10.x

Environment Variables:
  NODE_ENV: production
  NUXT_SESSION_SECRET: <32+ character random string>
  NUXT_TOKEN_SECRET: <32+ character random string>
  NUXT_PUBLIC_BASE_URL: https://your-domain.com
```

### 3.3 Recommended Hosting Options

| Provider                      | Tier    | Monthly Cost | Notes                      |
| ----------------------------- | ------- | ------------ | -------------------------- |
| **Railway**                   | Starter | $5-20        | Easy deployment, auto-SSL  |
| **Render**                    | Starter | $7           | Good for Node.js apps      |
| **DigitalOcean App Platform** | Basic   | $12          | Managed containers         |
| **VPS (DO/Vultr/Hetzner)**    | Basic   | $5-12        | More control, manual setup |
| **Vercel**                    | Pro     | $20          | Native Nuxt support        |

**Recommendation**: Railway or DigitalOcean App Platform for simplicity.

### 3.4 Domain & SSL

- [ ] Register production domain
- [ ] Configure DNS (A record or CNAME)
- [ ] Enable SSL/TLS (most platforms auto-provision Let's Encrypt)
- [ ] Configure HSTS headers
- [ ] Add to `nuxt.config.ts`:

```typescript
routeRules: {
  '/**': {
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    }
  }
}
```

---

## 4. Security Checklist

### 4.1 Pre-Deployment Security Audit

- [ ] **Secrets Management**

  - [ ] All secrets in environment variables (not in code)
  - [ ] `.env` files in `.gitignore`
  - [ ] Production secrets different from development
  - [ ] Secrets are 32+ characters, randomly generated

- [ ] **Rate Limiting**

  - [ ] All public endpoints have rate limits (Issue #119)
  - [ ] Rate limits are appropriate (not too permissive)
  - [ ] Rate limit bypass for health checks

- [ ] **Input Validation**

  - [ ] All API inputs validated with Valibot
  - [ ] XSS prevention via `sanitize.ts`
  - [ ] SQL injection prevented (parameterized queries)

- [ ] **Authentication**
  - [ ] Round tokens expire after 30 minutes
  - [ ] Session tokens properly validated
  - [ ] No sensitive data in client-accessible storage

### 4.2 Security Headers

Add to server middleware or `nuxt.config.ts`:

```typescript
// server/middleware/security-headers.ts
export default defineEventHandler((event) => {
  setHeaders(event, {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
});
```

### 4.3 Content Security Policy (CSP)

```typescript
'Content-Security-Policy': [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // Required for Nuxt
  "style-src 'self' 'unsafe-inline'",  // Required for Tailwind
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ')
```

---

## 5. Performance Optimization

### 5.1 Build Optimization

- [ ] **Verify production build size**

  ```bash
  npm run build
  npm run check-bundle-size
  ```

  Target: < 500KB initial JS

- [ ] **Enable compression** (usually handled by hosting platform)

- [ ] **Verify Vite chunking** in `nuxt.config.ts`:
  ```typescript
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', '@vueuse/core'],
            ui: ['@nuxt/ui'],
          }
        }
      }
    }
  }
  ```

### 5.2 Database Optimization

- [ ] **WAL mode enabled** (already in schema.ts)
- [ ] **Indexes verified**:

  - `players.name` - for search
  - `players.tm_id` - for lookups
  - `rounds.session_id` - for session queries
  - `rounds.expires_at` - for cleanup
  - `scores.session_id` - for leaderboard

- [ ] **Query performance audit**:
  - Run `EXPLAIN QUERY PLAN` on complex queries
  - Ensure no full table scans on large tables

### 5.3 Caching Strategy

| Resource               | Cache Strategy | TTL    |
| ---------------------- | -------------- | ------ |
| Static assets (JS/CSS) | Immutable      | 1 year |
| API responses          | No cache       | -      |
| Player data            | In-memory LRU  | 5 min  |
| Search results         | None           | -      |

### 5.4 Load Testing

Before production launch, run load tests:

```bash
# Install k6
# Run basic load test
k6 run --vus 50 --duration 30s load-test.js
```

Target metrics:

- P95 latency < 500ms
- 0% error rate at 50 concurrent users
- Memory usage < 512MB under load

---

## 6. Monitoring & Observability

### 6.1 Required Monitoring

| Type                  | Tool Options               | Priority |
| --------------------- | -------------------------- | -------- |
| **Uptime monitoring** | UptimeRobot, Better Uptime | P0       |
| **Error tracking**    | Sentry, LogRocket          | P1       |
| **Log aggregation**   | Platform logs, Papertrail  | P1       |
| **Performance (APM)** | New Relic, Datadog         | P2       |

### 6.2 Health Check Endpoint

Create `server/api/health.ts`:

```typescript
export default defineEventHandler(async (event) => {
  try {
    // Check DB connection
    const db = getDb();
    db.prepare("SELECT 1").get();

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      checks: {
        database: "ok",
      },
    };
  } catch (error) {
    setResponseStatus(event, 503);
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: "failed",
      },
    };
  }
});
```

### 6.3 Alerting Thresholds

| Metric       | Warning | Critical |
| ------------ | ------- | -------- |
| Error rate   | > 1%    | > 5%     |
| P95 latency  | > 1s    | > 3s     |
| Memory usage | > 70%   | > 90%    |
| Disk usage   | > 70%   | > 90%    |
| Uptime       | < 99.9% | < 99%    |

### 6.4 Logging Configuration

Production logging should:

- Write to stdout (for container orchestration)
- Use structured JSON format
- Include request IDs for tracing
- Rotate logs if writing to files

```typescript
// Production log level
logLevel: process.env.NODE_ENV === "production" ? "info" : "debug";
```

---

## 7. Database Operations

### 7.1 Backup Strategy

| Type          | Frequency | Retention | Method           |
| ------------- | --------- | --------- | ---------------- |
| Full backup   | Daily     | 30 days   | SQLite file copy |
| Point-in-time | N/A       | N/A       | WAL mode         |

**Backup script** (`scripts/backup-db.sh`):

```bash
#!/bin/bash
DB_PATH="server/db/file/main.db"
BACKUP_DIR="/backups/footyguess"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup with sqlite3 .backup command (safe for WAL)
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/main_$DATE.db'"

# Keep only last 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
```

### 7.2 Restore Procedure

```bash
# Stop the application
# Replace database file
cp /backups/footyguess/main_YYYYMMDD_HHMMSS.db server/db/file/main.db
# Start the application
```

### 7.3 Database Migrations

Currently using schema auto-creation. For future migrations:

1. Add migration files to `server/db/migrations/`
2. Track applied migrations in `schema_migrations` table
3. Run migrations on startup before serving requests

### 7.4 Session Cleanup

The `server/tasks/session-cleanup.ts` handles automatic cleanup of:

- Expired rounds (> 30 minutes)
- Orphaned sessions (> 24 hours inactive)

Ensure this task runs periodically in production.

---

## 8. Deployment Pipeline

### 8.1 Recommended CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Platform-specific deployment steps
```

### 8.2 Deployment Checklist

**Before each deployment:**

- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Bundle size within limits
- [ ] Environment variables configured
- [ ] Database backup completed

**After deployment:**

- [ ] Health check endpoint responding
- [ ] Smoke test: start game, reveal clue, make guess
- [ ] Monitor error rates for 15 minutes
- [ ] Check logs for unexpected errors

### 8.3 Rollback Plan

1. Keep previous deployment artifacts (2 versions)
2. Database changes should be backward-compatible
3. Rollback command: platform-specific (redeploy previous version)
4. Maximum rollback time target: 5 minutes

---

## 9. Legal & Compliance

### 9.1 Data Privacy

- [ ] **Privacy Policy** - Document what data is collected

  - Session IDs (anonymous)
  - Player statistics (no PII)
  - Leaderboard names (user-provided)

- [ ] **Cookie Notice** - If using cookies

  - Currently: localStorage only (no cookies)

- [ ] **GDPR Compliance** (if serving EU users)
  - [ ] Data deletion request process
  - [ ] Data export capability
  - [ ] Lawful basis for processing

### 9.2 Terms of Service

- [ ] Create Terms of Service document
- [ ] Include:
  - Acceptable use policy
  - Limitation of liability
  - Intellectual property notices

### 9.3 Data Attribution

- [ ] Player data sourced from public information
- [ ] Include attribution in About/Footer if required
- [ ] Respect robots.txt and rate limits during scraping

---

## 10. Launch Checklist

### 10.1 Pre-Launch (T-7 days)

- [ ] All critical blockers resolved (Section 2)
- [ ] Production environment provisioned
- [ ] Domain and SSL configured
- [ ] Monitoring and alerting set up
- [ ] Database backup automation working
- [ ] Load testing completed

### 10.2 Launch Day (T-0)

- [ ] Final production build deployed
- [ ] Health check passing
- [ ] Smoke test all critical paths:
  - [ ] Home page loads
  - [ ] Start new game
  - [ ] Reveal clues
  - [ ] Submit guess (correct)
  - [ ] Submit guess (incorrect)
  - [ ] Victory page
  - [ ] Leaderboard display
  - [ ] Help modal
- [ ] DNS propagation complete
- [ ] SSL certificate valid

### 10.3 Post-Launch (T+1 to T+7)

- [ ] Monitor error rates daily
- [ ] Review performance metrics
- [ ] Address any user-reported issues
- [ ] First database backup verified restorable
- [ ] Document any incidents

---

## Appendix A: Environment Variables Reference

```bash
# Required
NODE_ENV=production
NUXT_SESSION_SECRET=<generate: openssl rand -hex 32>
NUXT_TOKEN_SECRET=<generate: openssl rand -hex 32>

# Optional
NUXT_PUBLIC_BASE_URL=https://footyguess.com
LOG_LEVEL=info
```

---

## Appendix B: Quick Start Commands

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Run production server
node .output/server/index.mjs

# Check bundle size
npm run check-bundle-size

# Run all tests before deployment
npm test && npm run test:e2e
```

---

## Changelog

| Date       | Change                                |
| ---------- | ------------------------------------- |
| 2026-01-09 | Initial production readiness document |
