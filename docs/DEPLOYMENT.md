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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub PAT with `repo` scope |
| `ANTHROPIC_API_KEY` | Yes* | Claude API key |
| `GOOGLE_API_KEY` | Yes* | Gemini API key |
| `PORT` | No | Backend port (default: 3001) |
| `NODE_ENV` | No | `development` or `production` |

\* Required for AI features. PR metadata works without AI keys.

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
