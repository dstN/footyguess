import { describe, it, expect, beforeEach } from "vitest";
import { createRoundToken } from "../server/utils/tokens";
import { createTestEvent } from "./utils/h3";
import db, { resetDb } from "./utils/db";
import guessHandler from "../server/api/guess";
import useClueHandler from "../server/api/useClue";
import submitScoreHandler from "../server/api/submitScore";

function seedBasicPlayer() {
  db.prepare(
    `INSERT INTO players (id, name, active, total_stats) VALUES (?, ?, ?, ?)`,
  ).run(1, "Test Player", 1, "{}");

  db.prepare(`INSERT INTO competitions (id, name) VALUES (?, ?)`).run(
    "CL",
    "UEFA Champions League",
  );
  db.prepare(
    `INSERT INTO player_stats (player_id, competition_id, appearances) VALUES (?, ?, ?)`,
  ).run(1, "CL", 100);
}

describe("api routes", () => {
  beforeEach(() => {
    resetDb();
  });

  it("useClue increments clues", async () => {
    seedBasicPlayer();
    db.prepare(`INSERT INTO sessions (id) VALUES (?)`).run("sess1");
    db.prepare(
      `INSERT INTO rounds (id, player_id, session_id, clues_used, started_at, expires_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    ).run("round1", 1, "sess1", Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 600);

    const token = createRoundToken({
      roundId: "round1",
      playerId: 1,
      sessionId: "sess1",
      exp: Date.now() + 600_000,
    });

    const event = createTestEvent({
      method: "POST",
      url: "/api/useClue",
      body: { roundId: "round1", token },
    });

    const result = await useClueHandler(event);
    expect(result?.cluesUsed).toBe(1);
  });

  it("guess awards score and updates session", async () => {
    seedBasicPlayer();
    db.prepare(`INSERT INTO sessions (id) VALUES (?)`).run("sess1");
    db.prepare(
      `INSERT INTO rounds (id, player_id, session_id, clues_used, started_at, expires_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    ).run("round1", 1, "sess1", Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 600);

    const token = createRoundToken({
      roundId: "round1",
      playerId: 1,
      sessionId: "sess1",
      exp: Date.now() + 600_000,
    });

    const event = createTestEvent({
      method: "POST",
      url: "/api/guess",
      body: { roundId: "round1", token, guess: "Test Player" },
    });

    const result = await guessHandler(event);
    expect(result?.correct).toBe(true);
    expect(result?.score).toBeGreaterThan(0);

    const session = db
      .prepare(`SELECT streak, total_score FROM sessions WHERE id = ?`)
      .get("sess1") as { streak: number; total_score: number };
    expect(session.streak).toBe(1);
    expect(session.total_score).toBeGreaterThan(0);
  });

  it("submitScore stores last round score", async () => {
    seedBasicPlayer();
    db.prepare(`INSERT INTO sessions (id) VALUES (?)`).run("sess1");
    db.prepare(
      `INSERT INTO rounds (id, player_id, session_id, clues_used, started_at, expires_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    ).run("round1", 1, "sess1", Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 600);

    const token = createRoundToken({
      roundId: "round1",
      playerId: 1,
      sessionId: "sess1",
      exp: Date.now() + 600_000,
    });

    const guessEvent = createTestEvent({
      method: "POST",
      url: "/api/guess",
      body: { roundId: "round1", token, guess: "Test Player" },
    });
    await guessHandler(guessEvent);

    const submitEvent = createTestEvent({
      method: "POST",
      url: "/api/submitScore",
      body: { sessionId: "sess1", nickname: "Tester", type: "round" },
    });

    const result = await submitScoreHandler(submitEvent);
    expect(result?.ok).toBe(true);

    const entry = db
      .prepare(`SELECT value FROM leaderboard_entries WHERE session_id = ? AND type = ?`)
      .get("sess1", "round") as { value: number };
    expect(entry.value).toBeGreaterThan(0);
  });
});
