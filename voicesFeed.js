// Runtime logic for the Voices feature: for each tracked person, fetch their
// latest blog/newsletter posts (if they have a verified feed) and recent
// press mentions (via the same Google News RSS mechanism search.js uses).
// Entirely independent of the main search pipeline — a slow or failing
// voice must never affect the main search response.

import { extractTag, decodeEntities, fetchText } from './xml.js';
import { fetchGoogleNewsRss, parseGoogleNewsRss } from './search.js';
import { VOICES } from './voices.js';

const POSTS_LIMIT = 3;
const MENTIONS_LIMIT = 3;

// Parses RSS <item> or Atom <entry> blocks generically, since personal
// blogs/Substack/Medium/company blogs aren't all the same feed format.
function parseFeedItems(xml, limit) {
  let blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi);
  let isAtom = false;
  if (!blocks || blocks.length === 0) {
    blocks = xml.match(/<entry\b[\s\S]*?<\/entry>/gi);
    isAtom = true;
  }
  if (!blocks) return [];

  return blocks
    .slice(0, limit)
    .map((block) => {
      const title = extractTag(block, 'title');
      let link = extractTag(block, 'link');
      if (!link) {
        // Atom <link href="..."/> is self-closing, not a text node.
        const hrefMatch = block.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i);
        link = hrefMatch ? decodeEntities(hrefMatch[1]) : '';
      }
      const date =
        extractTag(block, 'pubDate') || extractTag(block, 'updated') || extractTag(block, 'published');
      return { title, link, date };
    })
    .filter((item) => item.title && item.link);
}

async function getFeedPosts(voice) {
  if (!voice.feedUrl) return [];
  try {
    const xml = await fetchText(voice.feedUrl);
    return parseFeedItems(xml, POSTS_LIMIT);
  } catch {
    return [];
  }
}

async function getMentions(voice) {
  try {
    const xml = await fetchGoogleNewsRss(voice.newsQuery);
    return parseGoogleNewsRss(xml)
      .slice(0, MENTIONS_LIMIT)
      .map((a) => ({ title: a.title, link: a.link, date: a.date, source: a.sourceName }));
  } catch {
    return [];
  }
}

// Lightweight variant used by trending.js: feed posts only, no news
// mentions, only for voices that actually have a verified feed.
export async function getVoicesPosts() {
  const tracked = VOICES.filter((v) => v.feedUrl);
  return Promise.all(
    tracked.map(async (voice) => ({ name: voice.name, posts: await getFeedPosts(voice) }))
  );
}

// Fetches posts + mentions for every tracked voice in parallel. Never
// throws — a failure for one person just means empty posts/mentions for
// them, so the section degrades to a name + affiliation row.
export async function getVoices() {
  return Promise.all(
    VOICES.map(async (voice) => {
      const [posts, mentions] = await Promise.all([getFeedPosts(voice), getMentions(voice)]);
      return {
        name: voice.name,
        handle: voice.handle,
        affiliation: voice.affiliation,
        feedUrl: voice.feedUrl,
        posts,
        mentions,
      };
    })
  );
}
