export const WHITELISTED_SOURCES = [
  { name: 'Reuters', domain: 'reuters.com', country: 'Global', tier: 1 },
  { name: 'Associated Press', domain: 'apnews.com', country: 'Global', tier: 1 },
  { name: 'BBC', domain: 'bbc.com', country: 'UK', tier: 2 },
  { name: 'The Guardian', domain: 'theguardian.com', country: 'UK', tier: 2 },
  { name: 'Financial Times', domain: 'ft.com', country: 'UK', tier: 2 },
  { name: 'The Independent', domain: 'independent.co.uk', country: 'UK', tier: 2 },
  { name: 'New York Times', domain: 'nytimes.com', country: 'USA', tier: 2 },
  { name: 'Wall Street Journal', domain: 'wsj.com', country: 'USA', tier: 2 },
  { name: 'CNN', domain: 'cnn.com', country: 'USA', tier: 2 },
  { name: 'CNBC', domain: 'cnbc.com', country: 'USA', tier: 2 },
  { name: 'Bloomberg', domain: 'bloomberg.com', country: 'USA', tier: 2 },
  { name: 'Al Jazeera', domain: 'aljazeera.com', country: 'Qatar', tier: 2 },
  { name: 'Vox', domain: 'vox.com', country: 'USA', tier: 3 },
  { name: 'TechCrunch', domain: 'techcrunch.com', country: 'USA', tier: 3 },
  { name: 'VentureBeat', domain: 'venturebeat.com', country: 'USA', tier: 3 },
  { name: 'Wired', domain: 'wired.com', country: 'USA', tier: 3 },
  { name: 'The Verge', domain: 'theverge.com', country: 'USA', tier: 3 },
  { name: 'Ars Technica', domain: 'arstechnica.com', country: 'USA', tier: 3 },
  { name: 'MIT Technology Review', domain: 'technologyreview.com', country: 'USA', tier: 3 },
  { name: 'Economic Times', domain: 'economictimes.indiatimes.com', country: 'India', tier: 2 },
  { name: 'Mint', domain: 'livemint.com', country: 'India', tier: 2 },
  { name: 'NDTV', domain: 'ndtv.com', country: 'India', tier: 2 },
  { name: 'Moneycontrol', domain: 'moneycontrol.com', country: 'India', tier: 3 },
  { name: 'YourStory', domain: 'yourstory.com', country: 'India', tier: 3 },
  { name: 'Inc42', domain: 'inc42.com', country: 'India', tier: 3 },
];

// Matches a hostname (e.g. "www.reuters.com") against the whitelist by domain,
// allowing subdomains (e.g. "edition.cnn.com" matches "cnn.com").
export function matchSource(hostname) {
  if (!hostname) return null;
  const host = hostname.replace(/^www\./, '').toLowerCase();
  return (
    WHITELISTED_SOURCES.find((s) => host === s.domain || host.endsWith(`.${s.domain}`)) || null
  );
}
