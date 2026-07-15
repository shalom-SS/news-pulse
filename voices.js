// Tracked thought leaders for the "Voices" feature. Each entry's feedUrl is
// only set if it was manually verified (fetched and confirmed to return
// real RSS/Atom items) — see the project's research notes. A null feedUrl
// means no working feed was found; that person falls back to press
// mentions only (see voicesFeed.js).

export const VOICES = [
  {
    name: 'Ara Kharazian',
    handle: 'arakharazian',
    affiliation: 'Economics Lead, Ramp',
    feedUrl: 'https://econlab.substack.com/feed',
    newsQuery: 'Ara Kharazian Ramp',
  },
  {
    name: 'Deedy Das',
    handle: 'deedydas',
    affiliation: 'Partner, Menlo Ventures',
    // No verifiable feed: personal site has no RSS link, his Substack is a
    // stub credited to someone else, his Medium has zero posts.
    feedUrl: null,
    newsQuery: 'Deedy Das Menlo Ventures',
  },
  {
    name: 'Aaron Levie',
    handle: 'levie',
    affiliation: 'CEO, Box',
    // Verified but dormant since Jan 2017 — kept since it's a real,
    // author-confirmed feed, just an inactive one.
    feedUrl: 'https://medium.com/feed/@levie',
    newsQuery: 'Aaron Levie Box AI',
  },
  {
    name: 'MacKenzie Price',
    handle: 'mackenzieprice',
    affiliation: 'Co-founder, Alpha School & 2 Hour Learning',
    feedUrl: 'https://futureofeducation.substack.com/feed',
    newsQuery: 'MacKenzie Price Alpha School',
  },
  {
    name: 'Vaibhav Sisinty',
    handle: 'VaibhavSisinty',
    affiliation: 'Founder, GrowthSchool',
    // Verified but a single post from 2018 — real and author-confirmed,
    // just effectively an abandoned account.
    feedUrl: 'https://medium.com/feed/@vaibhavsisinty',
    newsQuery: 'Vaibhav Sisinty GrowthSchool',
  },
  {
    name: 'Arnav Gupta',
    handle: 'championswimmer',
    affiliation: 'Engineering, Meta',
    feedUrl: 'https://threads.championswimmer.in/feed',
    newsQuery: 'Arnav Gupta Meta',
  },
  {
    name: 'Rahul GS',
    handle: 'rahulgs',
    affiliation: 'CTO, Ramp',
    feedUrl: 'https://builders.ramp.com/feed.xml',
    newsQuery: 'Rahul Ramp CTO',
  },
  {
    name: 'Richard Socher',
    handle: 'RichardSocher',
    affiliation: 'CEO, You.com & Recursive SI',
    feedUrl: 'https://www.socher.org/thoughts?format=rss',
    newsQuery: 'Richard Socher You.com',
  },
  {
    name: 'Prakash',
    handle: '8teAPi',
    affiliation: 'Tech commentator, AI in the AM',
    feedUrl: 'https://www.cogniscendo.com/feed',
    newsQuery: 'AI in the AM Prakash',
  },
  {
    name: 'Boris Cherny',
    handle: 'bcherny',
    affiliation: 'Claude Code, Anthropic',
    feedUrl: 'https://borischerny.com/feed',
    newsQuery: 'Boris Cherny Anthropic',
  },
  {
    name: 'Gavin Baker',
    handle: 'GavinSBaker',
    affiliation: 'Managing Partner & CIO, Atreides Management',
    feedUrl: 'https://gavin-baker.medium.com/feed',
    newsQuery: 'Gavin Baker Atreides',
  },
  {
    name: 'Shreyas Doshi',
    handle: 'shreyas',
    affiliation: 'Product leadership',
    feedUrl: 'https://shreyasdoshi.substack.com/feed',
    newsQuery: 'Shreyas Doshi product',
  },
  {
    name: 'Geoffrey Litt',
    handle: 'geoffreylitt',
    affiliation: 'Malleable software research, Notion',
    feedUrl: 'https://geoffreylitt.com/feed.xml',
    newsQuery: 'Geoffrey Litt Notion',
  },
  {
    name: 'Jay Sahnan',
    handle: 'JaySahnan',
    affiliation: 'Growth engineer, Browserbase',
    // No verifiable feed: personal site has no RSS, his Substack exists but
    // only contains a "coming soon" placeholder, Browserbase's blog RSS 500s.
    feedUrl: null,
    newsQuery: 'Jay Sahnan Browserbase',
  },
  {
    name: 'Anirudh Kamath',
    handle: 'kamathematic',
    affiliation: 'Co-founder, Smithery',
    feedUrl: 'https://anirudhkamath.substack.com/feed',
    newsQuery: 'Anirudh Kamath Smithery',
  },
  {
    name: 'Aakrit Vaish',
    handle: 'aakrit',
    affiliation: 'AI investor/operator',
    // A candidate feed exists (activatesignal.substack.com) but every post
    // is byline'd to his co-founder, not him personally — excluded.
    feedUrl: null,
    newsQuery: 'Aakrit Vaish AI India',
  },
  {
    name: 'Eric Zakariasson',
    handle: 'ericzakariasson',
    affiliation: 'Cursor',
    feedUrl: null,
    newsQuery: 'Eric Zakariasson Cursor',
  },
  {
    name: 'Rahul (selfawareatom)',
    handle: 'selfawareatom',
    affiliation: 'Foundation models team, Sarvam AI',
    feedUrl: null,
    newsQuery: 'Sarvam AI foundation models',
  },
  {
    name: 'Amol Jain',
    handle: 'amoljain_',
    affiliation: 'Head of Product Engineering, Replit',
    feedUrl: null,
    newsQuery: 'Amol Jain Replit',
  },
  {
    name: 'Vidit Gujrathi',
    handle: 'viditchess',
    affiliation: 'Chess Grandmaster',
    feedUrl: null,
    newsQuery: 'Vidit Gujrathi AI',
  },
  {
    name: 'Vivek Ravisankar',
    handle: 'vivekravisankar',
    affiliation: 'CEO & co-founder, HackerRank',
    // Author-scoped feed on the HackerRank blog — every item is
    // dc:creator "Vivek Ravisankar" (the site-wide feed is not).
    feedUrl: 'https://www.hackerrank.com/blog/author/vivek/feed/',
    newsQuery: 'Vivek Ravisankar HackerRank',
  },
];
