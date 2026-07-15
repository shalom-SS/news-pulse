// Vercel serverless function — deployed at /api/search.
// Wraps the same runSearch() pipeline used by the local dev server
// (see ../server.js and ../search.js) so both environments behave identically.

import { runSearch } from '../search.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');

  try {
    const result = await runSearch(url.searchParams.get('q'), url.searchParams.get('range'));
    res.status(200).json(result);
  } catch (err) {
    const status = err.status || 502;
    res.status(status).json({ error: err.message || 'Failed to fetch news' });
  }
}
