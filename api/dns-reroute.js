// /api/proxy-dns.js

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const targetURL = `https://dns.adguard-dns.com/dns-query`;

  const headers = {
    'accept': req.headers['accept'] || 'application/dns-json',
    'content-type': req.headers['content-type'] || '',
  };

  // Build the init object for fetch
  const init = {
    method: req.method,
    headers,
  };

  // Handle GET vs POST body forwarding
  if (req.method === 'POST') {
    const body = await req.arrayBuffer();
    init.body = body;
  }

  // If GET, forward query params directly
  const urlWithParams = req.method === 'GET' && req.url.includes('?')
    ? `${targetURL}${req.url.substring(req.url.indexOf('?'))}`
    : targetURL;

  try {
    const response = await fetch(urlWithParams, init);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
}
