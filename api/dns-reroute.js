// /api/dns-reroute.js

export default async function handler(req, res) {
  try {
    // Build the original full URL from incoming request
    const incomingUrl = new URL(req.url, `https://${req.headers.host}`);

    // Change hostname to AdGuard DNS
    incomingUrl.hostname = 'dns.adguard-dns.com';
    incomingUrl.protocol = 'https:';
    incomingUrl.port = '';

    const targetUrl = incomingUrl.toString();

    // Prepare headers (copy from request)
    const headers = { ...req.headers };

    // Override host header to AdGuard DNS
    headers.host = 'dns.adguard-dns.com';

    // Remove headers that can cause issues in proxy
    delete headers['content-length'];
    delete headers['connection'];

    // Handle OPTIONS method for CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept');
      return res.status(204).end();
    }

    // Prepare fetch options
    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Forward POST body if present
    if (req.method === 'POST') {
      const body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      fetchOptions.body = body;
    }

    // Fetch from AdGuard DNS
    const response = await fetch(targetUrl, fetchOptions);

    // Forward CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept');

    // Forward status code
    res.status(response.status);

    // Forward response headers (except hop-by-hop)
    response.headers.forEach((value, key) => {
      if (
        ![
          'transfer-encoding',
          'connection',
          'keep-alive',
          'proxy-authenticate',
          'proxy-authorization',
          'te',
          'trailers',
          'upgrade',
        ].includes(key.toLowerCase())
      ) {
        res.setHeader(key, value);
      }
    });

    // Forward response body as buffer
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy failed', details: error.message });
  }
}
