
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Content-Length');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  try {

    if (action === 'upload' && req.method === 'POST') {
      const chunks = [];
      await new Promise((resolve, reject) => {
        req.on('data', c => chunks.push(c));
        req.on('end', resolve);
        req.on('error', reject);
      });
      const buffer = Buffer.concat(chunks);
      const upRes = await fetch('https://api.replicate.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': req.headers['content-type'] || 'video/mp4',
          'Content-Length': String(buffer.length),
        },
        body: buffer,
      });
      const upData = await upRes.json();
      if (!upRes.ok) return res.status(upRes.status).json({ error: upData.detail || 'Upload gagal' });
      return res.status(200).json({ url: upData.urls?.source || upData.url });
    }

    if (action === 'create' && req.method === 'POST') {
      const chunks = [];
      await new Promise((resolve, reject) => {
        req.on('data', c => chunks.push(c));
        req.on('end', resolve);
        req.on('error', reject);
      });
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const scaleMap = { SD: 2, HD: 2, FHD: 4, '4K': 4 };
      const payload = {
        version: 'b8c9d67e0d8bdc3ee15e0e65b4b4c86e29af4c11e8ccc4aa1e56c3b3c4bc1b4',
        input: {
          video_path: body.videoUrl,
          model: 'RealESRGAN_x4plus',
          scale: scaleMap[body.quality] || 2,
        },
      };
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
