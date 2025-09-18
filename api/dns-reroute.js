// pages/api/proxy-dns.js

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const targetURL = 'https://dns.adguard-dns.com/dns-query';

  const headers = {
    accept: req.headers['accept'] || 'application/dns-json',
    'content-type': req.headers['content-type'] || '',
  };

  const init = {
    method: req.method,
    headers,
  };

  if (req.method === 'POST') {
    // Read raw body from Node stream
    const body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
    init.body = body;
  }

  const urlWithParams =
    req.method === 'GET' && req.url.includes('?')
      ? `${targetURL}${req.url.substring(req.url.indexOf('?'))}`
      : targetURL;

  try {
    const response = await fetch(urlWithParams, init);

    // Copy status and headers
    res.status(response.status);
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }

    const responseBuffer = await response.arrayBuffer();
    res.send(Buffer.from(responseBuffer));
  } catch (err) {
    console.error('DNS Proxy Error:', err);
    res
      .status(500)
      .json({ error: 'Failed to proxy request', details: err.message });
  }
}
