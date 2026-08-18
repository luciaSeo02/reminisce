// Vercel Serverless Function: proxies YouTube Data API v3 search so the
// API key stays server-side and is never sent to the frontend.

// Lightweight same-origin check, a deterrent rather than airtight
// protection (matches the PIN's threat model). The expected host comes
// from the request's own Host header, or VERCEL_URL as a fallback, so
// this needs no configuration in production, on any preview deployment,
// or for a self-hosted family instance. Fails open when Origin/Referer
// is absent, since some legitimate same-origin requests omit both.
export function isAllowedOrigin(req) {
  const source = req.headers.origin || req.headers.referer;
  if (!source) return true;

  let sourceHost;
  try {
    sourceHost = new URL(source).hostname;
  } catch {
    return false;
  }

  if (sourceHost === 'localhost' || sourceHost === '127.0.0.1') return true;

  const expectedHost = (req.headers.host || process.env.VERCEL_URL || '').split(':')[0];
  return Boolean(expectedHost) && sourceHost === expectedHost;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isAllowedOrigin(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.status(400).json({ error: 'Missing required query parameter: q' });
    return;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'YouTube search is not configured.' });
    return;
  }

  const youtubeUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  youtubeUrl.searchParams.set('part', 'snippet');
  youtubeUrl.searchParams.set('type', 'video');
  youtubeUrl.searchParams.set('maxResults', '12');
  youtubeUrl.searchParams.set('q', q);
  youtubeUrl.searchParams.set('key', apiKey);

  let ytResponse;
  try {
    ytResponse = await fetch(youtubeUrl);
  } catch {
    res.status(502).json({ error: 'Could not reach YouTube search right now.' });
    return;
  }

  if (!ytResponse.ok) {
    // Covers an invalid/expired key and other YouTube API errors; the
    // upstream error body is not forwarded so no key details leak.
    res.status(502).json({ error: 'YouTube search is unavailable right now.' });
    return;
  }

  const data = await ytResponse.json();
  const results = (data.items || [])
    .filter((item) => item.id && item.id.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet?.title ?? '',
      thumbnailUrl:
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        '',
    }));

  res.status(200).json({ results });
}
