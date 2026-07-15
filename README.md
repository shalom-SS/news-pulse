# News Pulse

**Live:** _deploying — link goes here once it's up_

A research tool that searches news on any topic, filters results down to a curated list of trusted sources, and ranks what's left by a transparent quality score.

Built as a small Node.js web app: a backend fetches and parses Google News RSS (browsers can't fetch RSS directly), the frontend renders results as scannable, editorial-style cards. No database, no accounts, no continuous monitoring — every search fetches fresh.

## What it does

1. Search any topic and pull matching articles from Google News RSS.
2. Filter results to a whitelist of 25 trusted sources (matched by domain, not by name text).
3. Filter by date range: last 7 days, 30 days, or 3 months.
4. Score and sort every article by quality, with a one-line explanation of why it ranked where it did.
5. Show a pickup counter — how many of your trusted sources are covering the topic.
6. Show two small trend views: a 14-day momentum chart (articles per day, trusted vs. other) and coverage by country.

## Source-tier methodology

Every whitelisted source is tagged with a tier, reflecting how much editorial weight it's given:

| Tier | Meaning | Examples |
|------|---------|----------|
| 1 | Wire services — first-hand reporting, minimal editorializing | Reuters, Associated Press |
| 2 | Major national/international outlets | BBC, NYT, WSJ, CNN, Bloomberg, Economic Times, NDTV, ... |
| 3 | Trade/specialist press — strong domain expertise, narrower scope | TechCrunch, Wired, YourStory, Inc42, ... |

The full list (source, domain, country, tier) lives in [`sources.js`](sources.js). Matching is done against the article's actual source domain (pulled from Google News RSS's `<source url="...">` attribute), not the display name — so regional subdomains and name variants still resolve correctly.

Articles from outside this whitelist are dropped from results, and the count of how many were filtered out is shown alongside the results.

## Scoring formula

Each article gets a score from 0–100, and a one-line "why it ranked" summary:

- **Source tier** — Tier 1 = 40 pts, Tier 2 = 30 pts, Tier 3 = 20 pts
- **Recency** — 40 pts if published today, scaling linearly down to 5 pts at 90 days old
- **Headline relevance** — up to 20 pts, based on the fraction of your search concepts found in the title

Relevance matching includes a small synonym/acronym layer (see [`scoring.js`](scoring.js)) so common equivalents count as the same concept in either direction — e.g. AI ↔ artificial intelligence, ML ↔ machine learning, GenAI ↔ generative AI, fintech ↔ financial technology, M&A ↔ merger and acquisition. Matching is whole-word, so short acronyms don't false-match inside unrelated words (e.g. "ai" won't match inside "email").

Results are sorted highest score first.

## Known limitations

- **Google News RSS caps out around the latest ~100 items** per query, regardless of how far back you search. This means:
  - Low-volume or older topics may show sparse or missing results even inside a valid date range.
  - The momentum (trend) chart is deliberately capped at a 14-day window — going further back would just show misleadingly empty days, since the feed rarely has 100 items' worth of history for most queries.
- Relevance matching is literal/word-based, not semantic — it won't catch every possible phrasing of a concept, only the ones in the synonym list.
- No caching or persistence — every search re-fetches from Google News live.

## Running it locally

```
node server.js
```

Then open `http://localhost:3000`. No dependencies to install — it's plain Node.js (built-in `http`/`https` modules only).

## Architecture

The search pipeline (fetch → filter → score → sort → trend data) lives in [`search.js`](search.js), shared by two entrypoints:

- [`server.js`](server.js) — a plain Node `http` server, used for local development. Serves the frontend from `public/` and handles `/api/search` directly.
- [`api/search.js`](api/search.js) — a Vercel serverless function, used in production. Same pipeline, deployed as `/api/search` on Vercel.

This keeps local dev dependency-free while still deploying cleanly to Vercel's serverless model.

---

Vibe coded in one day.
