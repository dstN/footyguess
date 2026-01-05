import db from "../db/connection.ts";

export type ScrapeJobType = "requested" | "stale" | "error";

export function enqueueScrapeJob(params: {
  type: ScrapeJobType;
  target: string;
  priority: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `
    INSERT INTO scrape_jobs (type, target, priority, status, next_run_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?)
    ON CONFLICT(type, target) DO UPDATE SET
      priority = MAX(priority, excluded.priority),
      status = 'pending',
      next_run_at = excluded.next_run_at,
      updated_at = excluded.updated_at
  `,
  ).run(params.type, params.target, params.priority, now, now);
}

export function getNextJob() {
  const now = Math.floor(Date.now() / 1000);
  return db
    .prepare(
      `
      SELECT id, type, target, priority, attempts
      FROM scrape_jobs
      WHERE status = 'pending' AND next_run_at <= ?
      ORDER BY priority DESC, id ASC
      LIMIT 1
    `,
    )
    .get(now) as
    | {
        id: number;
        type: ScrapeJobType;
        target: string;
        priority: number;
        attempts: number;
      }
    | undefined;
}

export function markJobProcessing(id: number) {
  db.prepare(
    `UPDATE scrape_jobs SET status = 'processing', updated_at = strftime('%s','now') WHERE id = ?`,
  ).run(id);
}

export function markJobDone(id: number) {
  db.prepare(
    `UPDATE scrape_jobs SET status = 'done', updated_at = strftime('%s','now') WHERE id = ?`,
  ).run(id);
}

export function markJobFailed(
  id: number,
  error: string,
  attempts: number,
  nextRunAt: number | null,
) {
  db.prepare(
    `UPDATE scrape_jobs
     SET status = ?, attempts = ?, last_error = ?, next_run_at = ?, updated_at = strftime('%s','now')
     WHERE id = ?`,
  ).run(nextRunAt ? "pending" : "failed", attempts, error, nextRunAt, id);
}
