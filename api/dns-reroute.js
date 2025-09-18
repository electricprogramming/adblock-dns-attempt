// /api/dns-reroute.js

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseUrl = 'https://dns.adguard-dns.com/dns-query';

  // Forward query parameters intact if GET request
  const urlWithParams = req.method === 'GET' && req.url.includes('?')
    ? `${baseUrl}${req.url.substring(req.url.indexOf('?'))}`
    : baseUrl;

  // Prepare headers for the proxy request
  const headers = {
    accept: req.headers['accept'] || 'application/dns-json',
    'content-type': req.headers['content-type'] || '',
  };

  const fetchOptions = {
    method: req.method,
    headers,
  };

  // For POST, forward raw body
  if (req.method === 'POST') {
    // Collect raw body chunks
    const body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
    fetchOptions.body = body;
  }

  try {
    const response = await fetch(urlWithParams, fetchOptions);

    // Set response status
    res.status(response.status);

    // Copy all response headers except some hop-by-hop headers that cause issues
    response.headers.forEach((value, key) => {
      // Optionally filter out headers here if needed
      res.setHeader(key, value);
    });

    // Copy response body as a buffer
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('DNS Proxy Error:', error);
    res.status(500).json({ error: 'Failed to proxy request', details: error.message });
  }
}
