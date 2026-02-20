module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  try {
    if (action === 'upload' && req.method === 'POST') {
      const { data, type } = req.body;
      if (!data) return res.status(400).json({ error: 'Missing content' });
      const buffer = Buffer.from(data, 'base64');
      const upRes = await fetch('https://api.replicate.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + apiKey,
          'Content-Type': type || 'video/mp4',
          'Content-Length': String(buffer.length)
        },
        body: buffer
      });
      const upData = await upRes.json();
      if (!upRes.ok) return res.status(upRes.status).json({ error: upData.detail || 'Upload gagal' });
      const url = (upData.urls && upData.urls.source) || upData.url;
      return res.status(200).json({ url });
    }

    if (action === 'create' && req.method === 'POST') {
      const { videoUrl, quality } = req.body;
      const scaleMap = { SD: 2, HD: 2, FHD: 4, '4K': 4 };
      const payload = {
        version: 'b8c9d67e0d8bdc3ee15e0e65b4b4c86e29af4c11e8ccc4aa1e56c3b3c4bc1b4',
        input: {
          video_path: videoUrl,
          model: 'RealESRGAN_x4plus',
          scale: scaleMap[quality] || 2
        }
      };
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': 'Token ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Replicate error' });
      return res.status(200).json({ id: data.id, status: data.status });
    }

    if (action === 'poll' && req.method === 'GET') {
      const { id } = req.query;
      const response = await fetch('https://api.replicate.com/v1/predictions/' + id, {
        headers: { 'Authorization': 'Token ' + apiKey }
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Poll error' });
      return res.status(200).json({ id: data.id, status: data.status, output: data.output, error: data.error });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
