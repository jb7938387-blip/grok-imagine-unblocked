# Grok Imagine Unblocked Backend

Free public image generation proxy using Pollinations + Craiyon fallbacks.

## Quick Start

```bash
npm install
npm start
```

Server runs on port 3001 (or `PORT` env var).

## API

### POST /api/generate

```json
{
  "prompt": "your prompt here",
  "type": "image"
}
```

Returns:
```json
{
  "success": true,
  "url": "https://image.pollinations.ai/...",
  "source": "Pollinations",
  "prompt": "...",
  "generatedAt": "..."
}
```

### GET /health

Health check.

## Deploy

Connect this repo to Render, Railway, Fly.io, or any Node host.
