import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchSource, WHITELISTED_SOURCES } from './sources.js';
import { scoreArticle } from './scoring.js';
import { momentumChart, coverageByCountry } from './trends.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = 3000;

// --- Minimal XML helpers (no external dependencies) ---

function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return '';
  let value = match[1].trim();
  // strip CDATA wrapper if present
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1];
  return decodeEntities(value.trim());
}

function extractSourceUrl(block) {
  const match = block.match(/<source\s+url="([^"]*)"/i);
  return match ? decodeEntities(match[1]) : '';
}

function parseGoogleNewsRss(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map((block) => {
    const sourceUrl = extractSourceUrl(block);
    let hostname = '';
    try {
      hostname = sourceUrl ? new URL(sourceUrl).hostname : '';
    } catch {
      hostname = '';
    }
    return {
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      date: extractTag(block, 'pubDate'),
      sourceName: extractTag(block, 'source'),
      sourceHostname: hostname,
    };
  });
}

const RANGE_DAYS = { '7': 7, '30': 30, '90': 90 };

function withinRange(dateStr, days) {
  if (!days) return true;
  const parsed = new Date(dateStr);
  if (isNaN(parsed)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return parsed.getTime() >= cutoff;
}

// --- Google News fetch ---

function fetchGoogleNewsRss(query) {
  return new Promise((resolve, reject) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=en-US&gl=US&ceid=US:en`;

    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // follow redirect once
          https
            .get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
              let data = '';
              res2.on('data', (chunk) => (data += chunk));
              res2.on('end', () => resolve(data));
            })
            .on('error', reject);
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

// --- Static file serving ---

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(PUBLIC_DIR, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// --- Server ---

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (parsedUrl.pathname === '/api/search') {
    const query = parsedUrl.searchParams.get('q');
    const rangeParam = parsedUrl.searchParams.get('range');
    const rangeDays = RANGE_DAYS[rangeParam] || null;

    if (!query || !query.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing search term' }));
      return;
    }
    try {
      const xml = await fetchGoogleNewsRss(query.trim());
      const rawArticles = parseGoogleNewsRss(xml);

      const trusted = [];
      let filteredOutBySource = 0;
      for (const article of rawArticles) {
        const source = matchSource(article.sourceHostname);
        if (source) {
          trusted.push({
            title: article.title,
            link: article.link,
            date: article.date,
            source,
          });
        } else {
          filteredOutBySource += 1;
        }
      }

      const inRange = trusted.filter((a) => withinRange(a.date, rangeDays));

      // Score every article, then sort highest-first.
      const finalArticles = inRange
        .map((a) => ({ ...a, ...scoreArticle(a, query.trim()) }))
        .sort((a, b) => b.score - a.score);

      // Pickup counter: how many distinct whitelisted sources appear in results.
      const sourcesCovered = new Set(finalArticles.map((a) => a.source.domain)).size;

      const trend = {
        momentum: momentumChart(rawArticles),
        coverageByCountry: coverageByCountry(finalArticles),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          articles: finalArticles,
          meta: {
            totalFetched: rawArticles.length,
            filteredOutBySource,
            filteredOutByDate: trusted.length - inRange.length,
            sourcesCovered,
            totalSources: WHITELISTED_SOURCES.length,
          },
          trend,
        })
      );
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch news' }));
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`News Pulse running at http://localhost:${PORT}`);
});
