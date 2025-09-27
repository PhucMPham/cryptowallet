import app from '../dist/index.js';

export default async (req, res) => {
  // Convert Vercel's req/res to fetch Request/Response for Hono
  const url = `https://${req.headers.host}${req.url}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      headers.append(key, Array.isArray(value) ? value.join(', ') : value);
    }
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  const response = await app.fetch(request);

  // Set status and headers
  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Send response body
  const body = await response.text();
  res.send(body);
};