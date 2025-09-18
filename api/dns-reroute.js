export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseUrl = 'https://dns.adguard-dns.com/dns-query';

  // Compose URL with query parameters for GET requests
  const urlWithParams = req.method === 'GET' && req.url.includes('?')
    ? `${baseUrl}${req.url.substring(req.url.indexOf('?'))}`
    : baseUrl;

  // Headers forwarding rules:
  // - Accept: pass or default to application/dns-json
  // - Content-Type: only forward on POST, ignore on GET to avoid AdGuard errors
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

  // For POST, pipe raw body
  if (req.method === 'POST') {
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

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('DNS Proxy Error:', error);
    res.status(500).json({ error: 'Failed to proxy request', details: error.message });
  }
}
