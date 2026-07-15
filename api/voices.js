// Vercel serverless function — deployed at /api/voices.
// Independent of /api/search: a slow or failing voice must never affect
// the main search response (see ../voicesFeed.js).

import { getVoices } from '../voicesFeed.js';

export default async function handler(req, res) {
  try {
    const voices = await getVoices();
    res.status(200).json({ voices });
  } catch (err) {
    res.status(502).json({ error: 'Failed to load voices' });
  }
}
