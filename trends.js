import { matchSource, WHITELISTED_SOURCES } from './sources.js';

const MOMENTUM_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayKey(date) {
  return date.toISOString().slice(0, 10);
}

// Buckets ALL fetched articles (trusted + outside sources) into the last
// 14 calendar days by publish date, independent of the date-range filter
// applied to the results list. Capped at 14 days because the RSS feed only
// returns the latest ~100 items regardless of query, so older buckets would
// be misleadingly sparse.
export function momentumChart(rawArticles) {
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const days = [];
  const indexByKey = {};
  for (let i = MOMENTUM_DAYS - 1; i >= 0; i--) {
    const d = new Date(todayUTC - i * DAY_MS);
    const key = utcDayKey(d);
    indexByKey[key] = days.length;
    days.push({
      date: key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      trusted: 0,
      other: 0,
    });
  }

  for (const article of rawArticles) {
    const parsed = new Date(article.date);
    if (isNaN(parsed)) continue;
    const idx = indexByKey[utcDayKey(parsed)];
    if (idx === undefined) continue; // outside the 14-day window
    if (matchSource(article.sourceHostname)) {
      days[idx].trusted += 1;
    } else {
      days[idx].other += 1;
    }
  }

  const firstWeek = days.slice(0, 7).reduce((sum, d) => sum + d.trusted + d.other, 0);
  const secondWeek = days.slice(7, 14).reduce((sum, d) => sum + d.trusted + d.other, 0);

  let verdict = 'steady';
  if (firstWeek === 0 && secondWeek === 0) {
    verdict = 'steady';
  } else if (secondWeek > firstWeek * 1.15) {
    verdict = 'rising';
  } else if (secondWeek < firstWeek * 0.85) {
    verdict = 'fading';
  }

  return { days, verdict };
}

// For the current (trusted, date-range-filtered) results, how many distinct
// whitelisted sources per country are represented, out of the total on file.
export function coverageByCountry(articles) {
  const totalByCountry = {};
  for (const s of WHITELISTED_SOURCES) {
    totalByCountry[s.country] = (totalByCountry[s.country] || 0) + 1;
  }

  const coveredDomainsByCountry = {};
  for (const article of articles) {
    const { country, domain } = article.source;
    if (!coveredDomainsByCountry[country]) coveredDomainsByCountry[country] = new Set();
    coveredDomainsByCountry[country].add(domain);
  }

  return Object.entries(totalByCountry)
    .map(([country, total]) => ({
      country,
      covered: coveredDomainsByCountry[country]?.size || 0,
      total,
    }))
    .sort((a, b) => b.covered - a.covered || b.total - a.total || a.country.localeCompare(b.country));
}
