export default async function handler(req, res) {
  // Allow CORS from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    // ── CREATE PREDICTION ──
    if (action === 'create' && req.method === 'POST') {
      const { videoUrl, model, quality } = req.body;

      const scaleMap = { SD: 2, HD: 2, FHD: 4, '4K': 4 };
      const scale = scaleMap[quality] || 4;

      const body = {
        version: 'b8c9d67e0d8bdc3ee15e0e65b4b4c86e29af4c11e8ccc4aa1e56c3b3c4bc1b4',
        input: {
          video_path: videoUrl,
          model: 'RealESRGAN_x4plus',
          scale: scale
        }
      };

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: data.detail || 'Replicate API error' });
      }

      return res.status(200).json({ id: data.id, status: data.status });
    }

    // ── POLL PREDICTION ──
    if (action === 'poll' && req.method === 'GET') {
      const { id } = req.query;

      const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { 'Authorization': `Token ${apiKey}` }
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: data.detail || 'Poll error' });
      }

      return res.status(200).json({
        id: data.id,
        status: data.status,
        output: data.output,
        error: data.error,
        logs: data.logs
      });
    }

    // ── UPLOAD FILE via proxy ──
    if (action === 'upload' && req.method === 'POST') {
      // Forward upload to file.io
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const response = await fetch('https://file.io/?expires=1d', {
          method: 'POST',
          body: buffer,
          headers: {
            'Content-Type': req.headers['content-type'],
            'Content-Length': buffer.length
          }
        });
        const data = await response.json();
        if (!data.success) {
          return res.status(500).json({ error: 'Upload failed: ' + data.message });
        }
        return res.status(200).json({ url: data.link });
      });
      return;
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
