// Vercel serverless function — deployed at /api/trending.
// Trending is decorative: on any failure return an empty phrase list so
// the frontend quietly falls back to its fixed chips.

import { getTrending } from '../trending.js';

export default async function handler(req, res) {
  try {
    const trending = await getTrending();
    res.status(200).json(trending);
  } catch (err) {
    res.status(200).json({ phrases: [] });
  }
}
