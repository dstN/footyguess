import sqlite3 from "sqlite3";
import { defineEventHandler, readBody } from "h3";
import removeDiacritics from "diacritics";

interface Player {
  id: string;
  name: string;
}

export default defineEventHandler(async (event) => {
  const { guess, targetId } = await readBody(event);
  const normalizedGuess = removeDiacritics.remove(guess).toLowerCase();

  return await new Promise((resolve, reject) => {
    const db = new sqlite3.Database("server/db/players.db");
    db.all(
      `SELECT id, name FROM players`,
      (err: Error | null, rows: Player[]) => {
        if (err) {
          db.close();
          return reject(err);
        }

        const matched = rows.find(
          (p) =>
            removeDiacritics.remove(p.name).toLowerCase() === normalizedGuess
        );

        if (!matched) {
          db.close();
          return resolve({ result: "unknown" });
        }

        if (matched.id === targetId) {
          db.close();
          return resolve({ result: "correct" });
        }

        db.close();
        return resolve({ result: "wrong", canGiveHint: true });
      }
    );
  });
});
