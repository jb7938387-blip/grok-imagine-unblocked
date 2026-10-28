const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Simple in-memory rate limit (8 requests per minute per IP)
const requestLog = new Map();

app.post('/api/generate', async (req, res) => {
  const { prompt, type = 'image' } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return res.status(400).json({ error: 'Valid prompt required (min 3 chars)' });
  }

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let userData = requestLog.get(ip);

  if (!userData || now > userData.reset) {
    userData = { count: 0, reset: now + 60000 };
  }

  if (userData.count >= 8) {
    return res.status(429).json({ error: 'Rate limit exceeded: 8 requests per minute' });
  }

  userData.count++;
  requestLog.set(ip, userData);

  // Video not supported on free public endpoints
  if (type === 'video') {
    return res.status(501).json({
      error: 'Free public text-to-video is not available',
      note: 'Services like Runway, Kling, Luma, etc. require paid API keys'
    });
  }

  try {
    let imageUrl = null;
    let source = null;

    // Fallback 1: Pollinations (usually the most reliable free option)
    try {
      const encoded = encodeURIComponent(prompt.trim());
      const seed = Date.now();
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
      
      // Quick check that the endpoint is alive
      await axios.head(pollinationsUrl, { timeout: 10000 });
      imageUrl = pollinationsUrl;
      source = 'Pollinations';
    } catch (e) {
      console.log('Pollinations failed:', e.message);
    }

    // Fallback 2: Craiyon public endpoint
    if (!imageUrl) {
      try {
        const craiyonRes = await axios.post(
          'https://backend.craiyon.com/generate',
          { prompt: prompt.trim() },
          { timeout: 90000 }
        );

        if (craiyonRes.data?.images?.[0]) {
          imageUrl = `data:image/png;base64,${craiyonRes.data.images[0]}`;
          source = 'Craiyon';
        }
      } catch (e) {
        console.log('Craiyon failed:', e.message);
      }
    }

    if (!imageUrl) {
      return res.status(503).json({
        error: 'All free public image services are currently unavailable or rate-limited',
        suggestion: 'Try again in a minute or switch to a different prompt'
      });
    }

    res.json({
      success: true,
      url: imageUrl,
      source,
      prompt: prompt.trim(),
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generation error:', error.message);
    res.status(500).json({
      error: 'Image generation failed',
      details: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Grok Imagine Unblocked Backend',
    endpoints: ['POST /api/generate', 'GET /health'],
    freeSources: ['Pollinations', 'Craiyon']
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Grok Imagine Unblocked Backend is running',
    usage: 'POST /api/generate with { "prompt": "your prompt", "type": "image" }'
  });
});

app.listen(port, () => {
  console.log(`🔥 Grok Imagine Unblocked backend running on port ${port}`);
});
