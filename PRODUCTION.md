# Production Readiness Plan

> **Status**: Production Ready ✅ **Last Updated**: 2026-01-10 **Version**:
> 1.2.0

This document outlines the production deployment status and requirements for
FootyGuess.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Infrastructure](#2-infrastructure)
3. [Security](#3-security)
4. [Deployment](#4-deployment)
5. [Database Operations](#5-database-operations)
6. [Monitoring](#6-monitoring)
7. [Launch Checklist](#7-launch-checklist)

---

## 1. Current State

### Completed ✅

| Area                | Status   | Version |
| ------------------- | -------- | ------- |
| Core Game Logic     | ✅ Ready | v1.0.0  |
| Service Layer       | ✅ Ready | v1.0.0  |
| Rate Limiting       | ✅ Ready | v1.0.0  |
| Error Handling      | ✅ Ready | v1.0.0  |
| Security Headers    | ✅ Ready | v1.0.0  |
| Health Check API    | ✅ Ready | v1.0.0  |
| Test Coverage       | ✅ Ready | v1.0.0  |
| Surrender Feature   | ✅ Ready | v1.1.0  |
| Exploit Prevention  | ✅ Ready | v1.1.0  |
| SEO Optimization    | ✅ Ready | v1.2.0  |
| Favicons & Manifest | ✅ Ready | v1.2.0  |

### Test Coverage

| Test File            | Coverage | Priority |
| -------------------- | -------- | -------- |
| `scoring.test.ts`    | 272 LOC  | P0       |
| `difficulty.test.ts` | 278 LOC  | P1       |
| `tokens.test.ts`     | 199 LOC  | P1       |

---

## 2. Infrastructure

### Server Requirements

```yaml
Minimum:
  CPU: 2 vCPU
  RAM: 2 GB
  Storage: 20 GB SSD
  Node.js: 20.x LTS

Recommended:
  CPU: 4 vCPU
  RAM: 4 GB
  Storage: 50 GB SSD
```

### Environment Variables

```bash
# Required
NODE_ENV=production
SCORING_SECRET=<generate: openssl rand -hex 32>

# Optional
FOOTYGUESS_DB_PATH=/path/to/footyguess.db
LOG_LEVEL=info
```

---

## 3. Security

### Implemented ✅

- **Rate Limiting**: All 12 API endpoints protected
- **Security Headers**: `server/middleware/security-headers.ts`
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: camera=(), microphone=(), geolocation=()
- **Token Security**: Round tokens with HMAC signatures, 30-min expiry
- **Input Validation**: Valibot schemas on all API endpoints
- **No Secrets in Code**: All credentials via environment variables

### Secrets Audit (2026-01-10)

- ✅ No hardcoded IPs
- ✅ No hardcoded credentials
- ✅ No API keys in code
- ✅ DEPLOYMENT.md removed from git history

---

## 4. Deployment

### CI/CD Pipeline

Located at `.github/workflows/deploy.yml`:

1. Run tests (`npm test`)
2. Build application (`npm run build`)
3. Deploy `.output/` via SCP
4. Restart application (touch `tmp/restart.txt`)

### GitHub Secrets Required

| Secret Name      | Description          |
| ---------------- | -------------------- |
| `SSH_HOST`       | Server IP/hostname   |
| `SSH_USER`       | SSH username         |
| `SSH_PASSWORD`   | SSH password         |
| `SSH_TARGET_DIR` | Deployment directory |

### Manual Deployment

```bash
# 1. Build
npm run build

# 2. Upload .output/ to server
scp -r .output user@server:/path/httpdocs/

# 3. Restart (Plesk)
touch /path/httpdocs/tmp/restart.txt
```

### Plesk Configuration

| Setting                 | Value                      |
| ----------------------- | -------------------------- |
| Node.js Version         | 20.x or 22.x               |
| Application Root        | `/httpdocs`                |
| Startup File            | `.output/server/index.mjs` |
| Environment: `HOST`     | `0.0.0.0`                  |
| Environment: `NODE_ENV` | `production`               |

---

## 5. Database Operations

### Backup

```bash
# SQLite backup (safe for WAL mode)
sqlite3 footyguess.db ".backup 'backup.db'"
```

### Update Database

1. Backup remote database first
2. Upload new `footyguess.db` via SFTP
3. Restart application to release file lock

### Troubleshooting

**ReadOnly Error**: Ensure write permissions on both file and directory:

```bash
chmod 755 /httpdocs/db
chmod 644 /httpdocs/db/footyguess.db
```

---

## 6. Monitoring

### Health Check

**Endpoint**: `GET /api/health`

```json
{
  "status": "healthy",
  "timestamp": "2026-01-10T12:00:00.000Z",
  "checks": { "database": "ok" }
}
```

### Recommended Tools

| Purpose        | Options                    |
| -------------- | -------------------------- |
| Uptime         | UptimeRobot, Better Uptime |
| Error Tracking | Sentry                     |
| Logs           | Platform logs, Papertrail  |

---

## 7. Launch Checklist

### Pre-Launch

- [x] All tests passing
- [x] Production build succeeds
- [x] Rate limiting on all endpoints
- [x] Security headers implemented
- [x] Health check endpoint working
- [x] SEO meta tags configured
- [x] Favicon and manifest added
- [x] robots.txt and sitemap.xml in place
- [x] No secrets in git history

### Post-Launch

- [ ] Monitor error rates for 24h
- [ ] Verify database backup restoration
- [ ] Check Google Search Console
- [ ] Submit sitemap to search engines

---

## Changelog

| Date       | Change                                    |
| ---------- | ----------------------------------------- |
| 2026-01-10 | Updated for v1.2.0, security audit passed |
| 2026-01-09 | Initial production readiness document     |
