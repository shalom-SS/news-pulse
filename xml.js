// Shared minimal XML/HTTP helpers (no external dependencies).
// Used by search.js (Google News RSS) and voicesFeed.js (arbitrary
// blog/Substack/Medium RSS & Atom feeds).

import https from 'node:https';

export function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return '';
  let value = match[1].trim();
  // strip CDATA wrapper if present
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1];
  return decodeEntities(value.trim());
}

// Fetches a URL as text, following redirects, with a timeout so one slow
// feed can't hang an entire batch request.
export function fetchText(url, { maxRedirects = 3, timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const attempt = (targetUrl, redirectsLeft) => {
      let settled = false;
      const req = https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          const nextUrl = new URL(res.headers.location, targetUrl).toString();
          attempt(nextUrl, redirectsLeft - 1);
          return;
        }
        if (res.statusCode >= 400) {
          settled = true;
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (!settled) {
            settled = true;
            resolve(data);
          }
        });
      });
      req.on('error', (err) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
      req.setTimeout(timeoutMs, () => {
        if (!settled) {
          settled = true;
          req.destroy(new Error('timeout'));
        }
      });
    };
    attempt(url, maxRedirects);
  });
}
