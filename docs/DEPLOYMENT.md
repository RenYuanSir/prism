# Deployment Guide

## Local Development

```bash
# 1. Clone and install
git clone <repo>
cd prism
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your tokens

# 3. Start dev servers
pnpm dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ | GitHub PAT with `repo` scope |
| `LLM_SUMMARY_PROVIDER` | ✅ | Summary stage provider |
| `LLM_SUMMARY_API_KEY` | ✅ | Summary stage API key |
| `LLM_SUMMARY_MODEL` | ✅ | Summary stage model name |
| `LLM_RISK_PROVIDER` | ✅ | Risk Model 1 provider |
| `LLM_RISK_API_KEY` | ✅ | Risk Model 1 API key |
| `LLM_RISK_MODEL` | ✅ | Risk Model 1 model name |
| `LLM_GEMINI_PROVIDER` | ✅ | Risk Model 2 provider |
| `LLM_GEMINI_API_KEY` | ✅ | Risk Model 2 API key |
| `LLM_GEMINI_MODEL` | ✅ | Risk Model 2 model name |
| `LLM_SUGGESTION_PROVIDER` | ✅ | Suggestion stage provider |
| `LLM_SUGGESTION_API_KEY` | ✅ | Suggestion stage API key |
| `LLM_SUGGESTION_MODEL` | ✅ | Suggestion stage model name |
| `LLM_*_BASE_URL` | No | Custom API base URL (for OpenAI-compatible services) |
| `PORT` | No | Backend port (default: 3001) |
| `NODE_ENV` | No | `development` or `production` |

**Supported Providers:** `anthropic` | `google` | `openai` | `openai-compatible`

The `openai-compatible` mode supports any OpenAI-compatible API (DeepSeek, Qwen, Bailian, Kimi, etc.). Set `LLM_*_BASE_URL` to point to your provider's endpoint.

## Production Build

```bash
# Build all packages
pnpm build

# Start production backend
cd apps/backend
NODE_ENV=production node dist/index.js

# Serve frontend (static files)
cd apps/frontend
cp -r dist/ /var/www/prism/
# Or use Vercel/Netlify for frontend hosting
```

## Docker (Optional)

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm build
EXPOSE 3001
CMD ["node", "apps/backend/dist/index.js"]
```

```bash
docker build -t prism .
docker run -p 3001:3001 --env-file .env prism
```

## Vercel Deployment (Frontend)

1. Connect GitHub repo to Vercel
2. Set root directory to `apps/frontend`
3. Build command: `cd ../.. && pnpm build:frontend`
4. Output directory: `dist`

## Railway/Render Deployment (Backend)

1. Connect GitHub repo
2. Set start command: `cd apps/backend && node dist/index.js`
3. Add environment variables in dashboard
