export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  try {

    // ── CREATE PREDICTION ──
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
          scale: scaleMap[body.quality] || 2
        }
      };

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Replicate error' });
      return res.status(200).json({ id: data.id, status: data.status });
    }

    // ── POLL STATUS ──
    if (action === 'poll' && req.method === 'GET') {
      const { id } = req.query;
      const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { 'Authorization': `Token ${apiKey}` }
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Poll error' });
      return res.status(200).json({
        id: data.id,
        status: data.status,
        output: data.output,
        error: data.error
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
