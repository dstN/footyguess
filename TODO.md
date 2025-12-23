# TODO

- Refactor `server/scraper/scrape-players.ts` so it can handle direct Transfermarkt player URLs:
  - Detect `isUrl = /^https?:\/\//i.test(name)` inside the loop.
  - If not a URL, keep the existing skip-if-in-DB logic.
  - For URLs: `page.goto(url, waitUntil: "networkidle2")` and skip the search table click; for names, keep the current search and first-link click.
  - Keep cookie handling unchanged.
  - Retain all downstream scraping logic (selectors, upserts).
  - Use an index-based loop to avoid using `players.indexOf` for labeling.
- Consider adding a request queue/API to submit a Transfermarkt URL and process it with the scraper as a separate job.
- Scoring/difficulty follow-ups:
  - Ensure difficulty selection always prefers international weighted apps first; only fall back to Top 5 if international does not meet thresholds, and avoid downgrading when international totals are higher.
  - Revisit thresholds/logic for cases where international > league but end up in a softer tier; adjust selection/recheck to keep international as primary.
  - Double-check total score / last-round submission paths include time-adjusted base (should already be in place).
