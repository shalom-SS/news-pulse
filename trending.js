// "Trending now" chip extraction. Pulls recent headlines from Google News
// top-stories/tech/business feeds filtered to the trusted-source whitelist,
// plus latest posts from the Voices feeds, then surfaces the capitalized
// 2-3 word phrases that repeat across at least 2 distinct sources.
// Results are cached in module scope so repeat requests are instant for
// the lifetime of the process (per warm instance on Vercel).

import { matchSource, WHITELISTED_SOURCES } from './sources.js';
import { fetchText } from './xml.js';
import { parseGoogleNewsRss } from './search.js';
import { getVoicesPosts } from './voicesFeed.js';

// Recent output (last 2 days) of a representative slice of the whitelist,
// via per-source Google News search feeds. A subset keeps this to 8
// parallel fetches; spread across tiers and countries so "trending" isn't
// just one region's front page.
const TRENDING_SOURCE_DOMAINS = [
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'cnbc.com',
  'bloomberg.com',
  'techcrunch.com',
  'theverge.com',
  'economictimes.indiatimes.com',
];

const PER_SOURCE_ITEM_CAP = 40;

const MAX_PHRASES = 5;
const MIN_DISTINCT_SOURCES = 2;
const CACHE_TTL_MS = 10 * 60 * 1000;

// Words that disqualify a phrase entirely — generic headline furniture,
// not topics. Checked per-word, lowercased.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'has',
  'have', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might',
  'this', 'that', 'these', 'those', 'its', 'his', 'her', 'their', 'your', 'our',
  'it', 'he', 'she', 'they', 'we', 'you', 'i', 'us', 'them', 'him', 'me',
  'what', 'when', 'where', 'why', 'how', 'who', 'which', 'while', 'after',
  'before', 'over', 'under', 'into', 'about', 'against', 'amid', 'despite',
  'news', 'says', 'said', 'say', 'new', 'report', 'reports', 'update',
  'updates', 'week', 'today', 'latest', 'breaking', 'live', 'watch', 'video',
  'opinion', 'analysis', 'exclusive', 'review', 'first', 'top', 'best',
  'here', 'heres', 'inside', 'behind', 'more', 'most', 'big', 'get', 'gets',
  'make', 'makes', 'not', 'now', 'just', 'still', 'up', 'down', 'out',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
]);

// Never suggest a source's own name as a topic.
const SOURCE_NAMES = new Set(WHITELISTED_SOURCES.map((s) => s.name.toLowerCase()));

// Google News titles end with " - Source Name"; drop it.
function stripSourceSuffix(title) {
  const i = title.lastIndexOf(' - ');
  return i > 0 ? title.slice(0, i) : title;
}

function cleanToken(word) {
  return word.replace(/^["'‘“(\[]+/, '').replace(/["'’”)\].,:;!?]+$/g, '');
}

// A token counts as "capitalized" if it starts with an uppercase letter or
// is an all-caps/alphanumeric acronym (AI, H200, M&A).
function isCapToken(word) {
  return /^[A-Z][A-Za-z0-9.&'’-]*$/.test(word) || /^[A-Z0-9][A-Z0-9.&-]+$/.test(word);
}

function normalizeWord(word) {
  return word.replace(/['’]s$/i, '').toLowerCase();
}

function phraseOk(words) {
  for (const w of words) {
    const norm = normalizeWord(w);
    if (norm.length < 2 || /^\d+$/.test(norm) || STOPWORDS.has(norm)) return false;
  }
  const full = words.map(normalizeWord).join(' ');
  return !SOURCE_NAMES.has(full);
}

// All 2-3 word sub-phrases of consecutive-capitalized runs in a title.
function extractCandidates(title) {
  const tokens = stripSourceSuffix(title).split(/\s+/).map(cleanToken).filter(Boolean);
  const runs = [];
  let current = [];
  for (const token of tokens) {
    if (isCapToken(token)) {
      current.push(token);
    } else {
      if (current.length >= 2) runs.push(current);
      current = [];
    }
  }
  if (current.length >= 2) runs.push(current);

  const candidates = [];
  for (const run of runs) {
    for (let len = 2; len <= 3; len++) {
      for (let i = 0; i + len <= run.length; i++) {
        const words = run.slice(i, i + len);
        if (phraseOk(words)) candidates.push(words);
      }
    }
  }
  return candidates;
}

function extractPhrases(titles /* [{title, sourceKey, isVoice}] */) {
  const agg = new Map(); // normalized phrase -> {display, sources, count, voices}
  for (const { title, sourceKey, isVoice } of titles) {
    const seenInTitle = new Set(); // count each phrase once per title
    for (const words of extractCandidates(title)) {
      const norm = words.map(normalizeWord).join(' ');
      if (seenInTitle.has(norm)) continue;
      seenInTitle.add(norm);
      let entry = agg.get(norm);
      if (!entry) {
        entry = { display: words.join(' '), sources: new Set(), count: 0, voices: false };
        agg.set(norm, entry);
      }
      entry.sources.add(sourceKey);
      entry.count += 1;
      if (isVoice) entry.voices = true;
    }
  }

  const qualified = [...agg.entries()]
    .filter(([, e]) => e.sources.size >= MIN_DISTINCT_SOURCES)
    .sort(
      ([aKey, a], [bKey, b]) =>
        b.sources.size - a.sources.size || b.count - a.count || aKey.length - bKey.length
    );

  // Drop phrases that overlap an already-picked stronger phrase
  // ("AI Chips" vs "Nvidia AI Chips").
  const picked = [];
  for (const [norm, entry] of qualified) {
    const padded = ` ${norm} `;
    const overlaps = picked.some(
      (p) => ` ${p.norm} `.includes(padded) || padded.includes(` ${p.norm} `)
    );
    if (!overlaps) picked.push({ norm, ...entry });
    if (picked.length >= MAX_PHRASES) break;
  }

  return picked.map((p) => ({ label: p.display, voices: p.voices }));
}

async function fetchTrustedHeadlines() {
  const results = await Promise.allSettled(
    TRENDING_SOURCE_DOMAINS.map((domain) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
        `site:${domain} when:2d`
      )}&hl=en-US&gl=US&ceid=US:en`;
      return fetchText(url).then((xml) => ({ domain, xml }));
    })
  );

  const titles = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { domain, xml } = result.value;
    for (const article of parseGoogleNewsRss(xml).slice(0, PER_SOURCE_ITEM_CAP)) {
      // The site: query should only return this domain, but re-verify
      // against the whitelist and drop anything that leaked through.
      const source = matchSource(article.sourceHostname);
      if (!source || source.domain !== domain) continue;
      titles.push({ title: article.title, sourceKey: source.domain, isVoice: false });
    }
  }
  return titles;
}

let cache = { data: null, ts: 0 };

export async function getTrending() {
  if (cache.data && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;

  const [headlines, voicesPosts] = await Promise.all([
    fetchTrustedHeadlines(),
    getVoicesPosts().catch(() => []),
  ]);

  const titles = [...headlines];
  for (const voice of voicesPosts) {
    for (const post of voice.posts) {
      titles.push({ title: post.title, sourceKey: `voice:${voice.name}`, isVoice: true });
    }
  }

  const data = { phrases: extractPhrases(titles), generatedAt: new Date().toISOString() };
  cache = { data, ts: Date.now() };
  return data;
}
