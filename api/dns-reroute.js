// /api/dns-reroute.js

export default async function handler(req, res) {
  const baseUrl = 'https://dns.adguard-dns.com/dns-query';

  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.status(204).end();
  }

  // Compose target URL
  const urlWithParams = req.method === 'GET' && req.url.includes('?')
    ? `${baseUrl}${req.url.substring(req.url.indexOf('?'))}`
    : baseUrl;

  // Build headers for forwarding request
  const headers = {
    accept: req.headers['accept'] || 'application/dns-json',
  };

  if (req.method === 'POST' && req.headers['content-type']) {
    headers['content-type'] = req.headers['content-type'];
  }

  const fetchOptions = {
    method: req.method,
    headers,
  };

  if (req.method === 'POST') {
    const body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
    fetchOptions.body = body;
  }

  try {
    const response = await fetch(urlWithParams, fetchOptions);

    // Set CORS headers on the response to client
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    // Forward response status and headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      // Skip hop-by-hop headers if necessary
      res.setHeader(key, value);
    });

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('DNS Proxy Error:', err);
    res.status(500).json({ error: 'Failed to proxy request', details: err.message });
  }
}
