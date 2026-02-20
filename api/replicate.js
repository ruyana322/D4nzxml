const https = require('https');
const http = require('http');

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function fetchUrl(url, opts) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    };
    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => JSON.parse(body)
        });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Content-Length');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  try {
    if (action === 'upload' && req.method === 'POST') {
      const buffer = await readBody(req);
      const upRes = await fetchUrl('https://api.replicate.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + apiKey,
          'Content-Type': req.headers['content-type'] || 'video/mp4',
          'Content-Length': String(buffer.length)
        },
        body: buffer
      });
      const upData = upRes.json();
      if (!upRes.ok) return res.status(upRes.status).json({ error: upData.detail || 'Upload gagal' });
      return res.status(200).json({ url: upData.urls && upData.urls.source ? upData.urls.source : upData.url });
    }

    if (action === 'create' && req.method === 'POST') {
      const buffer = await readBody(req);
      const body = JSON.parse(buffer.toString());
      const scaleMap = { SD: 2, HD: 2, FHD: 4, '4K': 4 };
      const payload = JSON.stringify({
        version: 'b8c9d67e0d8bdc3ee15e0e65b4b4c86e29af4c11e8ccc4aa1e56c3b3c4bc1b4',
        input: {
          video_path: body.videoUrl,
          model: 'RealESRGAN_x4plus',
          scale: scaleMap[body.quality] || 2
        }
      });
      const response = await fetchUrl('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + apiKey,
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(payload))
        },
        body: payload
      });
      const data = response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Replicate error' });
      return res.status(200).json({ id: data.id, status: data.status });
    }

    if (action === 'poll' && req.method === 'GET') {
      const { id } = req.query;
      const response = await fetchUrl('https://api.replicate.com/v1/predictions/' + id, {
        method: 'GET',
        headers: { 'Authorization': 'Token ' + apiKey }
      });
      const data = response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Poll error' });
      return res.status(200).json({ id: data.id, status: data.status, output: data.output, error: data.error });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
