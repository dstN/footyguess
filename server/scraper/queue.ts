import db from "../db/connection.ts";
import { logInfo, logError } from "../utils/logger";

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
  // If nextRunAt is null, it means max retries reached -> move to DLQ
  if (nextRunAt === null) {
    const job = db
      .prepare(
        `SELECT type, target, priority, created_at FROM scrape_jobs WHERE id = ?`,
      )
      .get(id) as
      | {
          type: string;
          target: string;
          priority: number;
          created_at: number;
        }
      | undefined;

    if (job) {
      try {
        db.transaction(() => {
          // Insert into DLQ
          db.prepare(
            `INSERT INTO scrape_jobs_dlq (id, type, target, priority, attempts, last_error, original_created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            id,
            job.type,
            job.target,
            job.priority,
            attempts,
            error,
            job.created_at,
          );

          // Remove from active queue
          db.prepare(`DELETE FROM scrape_jobs WHERE id = ?`).run(id);
        })();

        logError(
          `Job ${id} permanently failed, moved to DLQ`,
          new Error(error),
          { jobId: id, target: job.target },
        );
      } catch (err) {
        logError(`Failed to move job ${id} to DLQ`, err as Error, {
          jobId: id,
        });
        // Fallback: just mark as failed in place
        db.prepare(
          `UPDATE scrape_jobs
             SET status = 'failed', attempts = ?, last_error = ?, next_run_at = NULL, updated_at = strftime('%s','now')
             WHERE id = ?`,
        ).run(attempts, error, id);
      }
    }
  } else {
    // Retry: update status to pending and set next_run_at
    db.prepare(
      `UPDATE scrape_jobs
       SET status = 'pending', attempts = ?, last_error = ?, next_run_at = ?, updated_at = strftime('%s','now')
       WHERE id = ?`,
    ).run(attempts, error, nextRunAt, id);
  }
}
