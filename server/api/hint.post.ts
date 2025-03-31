import sqlite3 from "sqlite3";
import { defineEventHandler, readBody } from "h3";
import removeDiacritics from "diacritics";

interface Player {
  id: string;
  name: string;
  birthdate?: string | null;
  nationality?: string | null;
  position?: string | null;
  shirt_number?: string | null;
  foot?: string | null;
  active?: number | null;
  deathdate?: string | null;
}

function calculateAge(birthdate: string): number | null {
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return null;
  const ageDiff = Date.now() - birth.getTime();
  return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
}

export default defineEventHandler(async (event) => {
  const { guess, targetId } = await readBody(event);
  const normalizedGuess = removeDiacritics.remove(guess).toLowerCase();

  return await new Promise((resolve, reject) => {
    const db = new sqlite3.Database("server/db/players.db");
    db.all(`SELECT * FROM players`, (err: Error | null, rows: Player[]) => {
      if (err) {
        db.close();
        return reject(err);
      }

      const matched = rows.find(
        (p) => removeDiacritics.remove(p.name).toLowerCase() === normalizedGuess
      );
      const target = rows.find((p) => p.id === targetId);

      if (!matched || !target) {
        db.close();
        return resolve({ result: "unknown" });
      }

      if (matched.id === target.id) {
        db.close();
        return resolve({ result: "correct" });
      }

      const possibleHints: string[] = [];

      if (matched.nationality && target.nationality) {
        possibleHints.push(
          matched.nationality === target.nationality
            ? "hints.nationality.correct"
            : "hints.nationality.incorrect"
        );
      } else {
        console.log("🛑 Nationalität fehlt bei einem der Spieler.");
      }

      if (matched.position && target.position) {
        possibleHints.push(
          matched.position === target.position
            ? "hints.position.correct"
            : "hints.position.incorrect"
        );
      } else {
        console.log("🛑 Position fehlt bei einem der Spieler.");
      }

      if (matched.shirt_number && target.shirt_number) {
        const numGuess = parseInt(matched.shirt_number);
        const numTarget = parseInt(target.shirt_number);
        if (!isNaN(numGuess) && !isNaN(numTarget)) {
          possibleHints.push(
            numGuess > numTarget
              ? "hints.shirt_number.higher"
              : numGuess < numTarget
              ? "hints.shirt_number.lower"
              : "hints.shirt_number.exact"
          );
        } else {
          console.log("🛑 Rückennummer ist kein gültiger Zahlwert.");
        }
      } else {
        console.log("🛑 Rückennummer fehlt bei einem der Spieler.");
      }

      if (matched.birthdate && target.birthdate) {
        const ageGuess = calculateAge(matched.birthdate);
        const ageTarget = calculateAge(target.birthdate);
        if (ageGuess !== null && ageTarget !== null) {
          if (ageGuess > ageTarget) {
            possibleHints.push("hints.age.younger");
          } else if (ageGuess < ageTarget) {
            possibleHints.push("hints.age.older");
          } else {
            possibleHints.push("hints.age.same");
          }
        } else {
          console.log("🛑 Alter konnte nicht berechnet werden.");
        }
      } else {
        console.log("🛑 Geburtsdatum fehlt bei einem der Spieler.");
      }

      if (matched.foot && target.foot) {
        possibleHints.push(
          matched.foot === target.foot
            ? "hints.foot.correct"
            : "hints.foot.incorrect"
        );
      } else {
        console.log("🛑 Fußpräferenz fehlt bei einem der Spieler.");
      }

      if (matched.active !== null && target.active !== null) {
        possibleHints.push(
          matched.active === target.active
            ? "hints.active.same"
            : target.active
            ? "hints.active.true"
            : "hints.active.false"
        );
      } else {
        console.log("🛑 Aktivitätsstatus fehlt bei einem der Spieler.");
      }

      if (matched.deathdate || target.deathdate) {
        possibleHints.push(
          matched.deathdate === target.deathdate
            ? "hints.dead.same"
            : target.deathdate
            ? "hints.dead.true"
            : "hints.dead.false"
        );
      } else {
        console.log("🛑 Todesstatus fehlt oder bei beiden Spielern leer.");
      }

      console.log("✅ Verfügbare Hints:", possibleHints);
      console.log("🕵️‍♂️ matched:", matched.name, matched);
      console.log("🎯 target:", target.name, target);

      db.close();
      const randomHint =
        possibleHints[Math.floor(Math.random() * possibleHints.length)] ||
        "hints.none";
      console.log("🎁 Ausgewählter Hint:", randomHint);

      return resolve({ hint: randomHint });
    });
  });
});
