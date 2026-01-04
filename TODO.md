# TODO

- Scraper direct URL support is done (`scrape-players.ts` now handles full URLs and skips the search step).
- Request queue is in place (`requested_players` table + request/status APIs + `process-requested.ts` runner).
- Difficulty selection now prefers international weighted apps first, falling back to Top 5 only when international doesn’t meet thresholds.
- Time-adjusted base is used for submissions and won screen.
