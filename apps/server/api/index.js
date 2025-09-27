import app from '../dist/index.js';

export default async (req, res) => {
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;

    // Check if origin matches any allowed pattern
    if (origin && (origin.includes('cryptowallet') && origin.includes('vercel.app')) ||
        origin === 'https://cryptowallet-ruby.vercel.app' ||
        origin === process.env.CORS_ORIGIN) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.status(200).end();
      return;
    }
  }

  // Convert Vercel's req/res to fetch Request/Response for Hono
  const url = `https://${req.headers.host}${req.url}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      headers.append(key, Array.isArray(value) ? value.join(', ') : value);
    }
  }

  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body
  });

  const response = await app.fetch(request);

  // Set status
  res.status(response.status);

  // Copy all headers from Hono response
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Send response body
  const responseBody = await response.text();
  res.send(responseBody);
};