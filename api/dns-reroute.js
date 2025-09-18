export default async function handler(req, res) {
  // Get original full URL from req
  const incomingUrl = new URL(req.url, `https://${req.headers.host}`);

  // Replace host and protocol with AdGuard DNS host and https
  incomingUrl.hostname = 'dns.adguard-dns.com';
  incomingUrl.protocol = 'https:';
  incomingUrl.port = ''; // clear any port if present

  // Compose the target URL
  const targetUrl = incomingUrl.toString();

  // Prepare headers to forward (copy most headers except host)
  const headers = { ...req.headers };
  headers.host = 'dns.adguard-dns.com';

  // Remove headers that may cause issues
  delete headers['content-length'];
  delete headers['connection'];

  // Prepare fetch options
  const fetchOptions = {
    method: req.method,
    headers,
  };

  // Forward body if POST
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
    const response = await fetch(targetUrl, fetchOptions);

    // Forward CORS headers so client can access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept');

    // Forward response status
    res.status(response.status);

    // Forward response headers (except some hop-by-hop headers)
    response.headers.forEach((value, key) => {
      if (
        !['transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade']
          .includes(key.toLowerCase())
      ) {
        res.setHeader(key, value);
      }
    });

    // Stream response body
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy failed', details: error.message });
  }
}
