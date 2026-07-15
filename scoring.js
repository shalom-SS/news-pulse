// Quality scoring for articles. Score is 0-100, composed of:
//   source tier   (tier 1 = 40, tier 2 = 30, tier 3 = 20)
// + recency        (published today = 40, scaling linearly down to 5 at 90 days)
// + headline match (up to 20, by fraction of search terms found in the title)

const TIER_POINTS = { 1: 40, 2: 30, 3: 20 };

function daysSince(dateStr) {
  const parsed = new Date(dateStr);
  if (isNaN(parsed)) return null;
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function recencyPoints(days) {
  if (days === null) return 5;
  if (days >= 90) return 5;
  // Linear: 40 at day 0, 5 at day 90.
  return Math.round(40 - (days / 90) * 35);
}

// Plain synonym/acronym lookup. Each group is a set of equivalent phrases;
// a title matching ANY phrase in a group counts as matching the whole concept.
// Order matters: more specific (longer) phrases first, so e.g. "generative ai"
// is consumed before the plain "ai" group can claim its "ai".
const SYNONYM_GROUPS = [
  ['generative ai', 'genai', 'gen ai'],
  ['artificial intelligence', 'ai'],
  ['machine learning', 'ml'],
  ['financial technology', 'fintech'],
  ['merger and acquisition', 'mergers and acquisitions', 'm&a', 'm and a'],
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-word match, so short acronyms ("ai", "ml") don't match inside
// words like "email" or "html".
function phraseRegex(phrase, flags) {
  return new RegExp(`\\b${escapeRegex(phrase)}\\b`, flags);
}

function contains(haystack, phrase) {
  return phraseRegex(phrase, 'i').test(haystack);
}

// Break the query into "concepts" to match. A concept is either a recognized
// synonym group (matchable by any of its phrases) or a single leftover word.
function buildConcepts(query) {
  let remaining = query.toLowerCase();
  const concepts = [];

  for (const group of SYNONYM_GROUPS) {
    if (group.some((phrase) => contains(remaining, phrase))) {
      concepts.push(group);
      // Strip every phrase in this group so its words aren't recounted below.
      for (const phrase of group) {
        remaining = remaining.replace(phraseRegex(phrase, 'gi'), ' ');
      }
    }
  }

  const words = remaining
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
  for (const word of words) concepts.push([word]);

  return concepts;
}

function relevance(title, concepts) {
  if (concepts.length === 0) return { points: 0, fraction: 0 };
  const matched = concepts.filter((variants) =>
    variants.some((phrase) => contains(title, phrase))
  ).length;
  const fraction = matched / concepts.length;
  return { points: Math.round(fraction * 20), fraction };
}

function tierPhrase(tier) {
  if (tier === 1) return 'Tier 1 wire service';
  if (tier === 2) return 'Tier 2 source';
  return 'Tier 3 source';
}

function recencyPhrase(days) {
  if (days === null) return 'date unknown';
  if (days === 0) return 'published today';
  if (days === 1) return 'published yesterday';
  return `published ${days} days ago`;
}

function matchPhrase(fraction, hasTerms) {
  if (!hasTerms) return null;
  if (fraction >= 0.999) return 'strong match';
  if (fraction > 0) return 'partial match';
  return 'weak match';
}

// Returns { score, reason, breakdown } for one article.
export function scoreArticle(article, query) {
  const concepts = buildConcepts(query);
  const days = daysSince(article.date);

  const tierPts = TIER_POINTS[article.source.tier] || 0;
  const recencyPts = recencyPoints(days);
  const { points: relevancePts, fraction } = relevance(article.title, concepts);

  const score = tierPts + recencyPts + relevancePts;

  const parts = [tierPhrase(article.source.tier), recencyPhrase(days)];
  const match = matchPhrase(fraction, concepts.length > 0);
  if (match) parts.push(match);
  const reason = parts.join(' · ');

  return {
    score,
    reason,
    breakdown: { tier: tierPts, recency: recencyPts, relevance: relevancePts },
  };
}
