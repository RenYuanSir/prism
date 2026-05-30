# PRism

AI-powered pull request review assistant with semantic diff analysis, multi-model consensus, impact heatmaps, and race condition detection.

## Features

- **Semantic Diff Analysis** — AST-based parsing of code changes with function/variable-level tracking
- **Multi-Model Consensus** — Claude + Gemini dual-model review with disagreement detection
- **Impact Heatmap** — Visual dependency graph showing blast radius of changes
- **Race Condition Detection** — Static analysis for concurrency risks in async code
- **Smart Caching** — LocalStorage-based result caching with TTL
- **Dark Theme UI** — Tailwind CSS + shadcn/ui modern interface

## Architecture

```
prism/
├── apps/
│   ├── frontend/    # React 18 + Vite + Tailwind CSS + shadcn/ui
│   │   ├── src/pages/        # PRList, ReviewResult, Settings, History
│   │   ├── src/components/   # FileChangeCard, ImpactHeatmap, ConsensusView, RaceConditionTimeline
│   │   └── src/api/          # Backend API client
│   └── backend/     # Node.js + Express API server
│       ├── src/services/
│       │   ├── github.ts              # GitHub API client
│       │   ├── diff-analyzer.ts       # Semantic diff parser
│       │   ├── ast-parser.ts          # Tree-sitter AST analysis
│       │   ├── ai-review-pipeline.ts  # Claude + Gemini orchestration
│       │   ├── consensus-merger.ts    # Multi-model agreement detection
│       │   ├── impact-analyzer.ts     # Dependency impact graph
│       │   └── race-condition-analyzer.ts  # Concurrency risk detection
│       └── src/index.ts       # Express routes
├── packages/
│   └── shared/      # Shared TypeScript types and utilities
├── .github/workflows/ci.yml   # GitHub Actions CI
├── biome.json                 # Lint/format config
├── vitest.config.ts           # Test config
└── pnpm-workspace.yaml        # Monorepo workspace
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 18 |
| Package Manager | pnpm >= 8 |
| Language | TypeScript 5.4+ (strict mode) |
| Frontend | React 18, Vite 5, Tailwind CSS 3, shadcn/ui |
| Backend | Express 4, Tree-sitter, dotenv |
| Testing | Vitest 2 (97 tests, 9 test files) |
| Linting/Formatting | Biome |
| Git Hooks | Husky 9 + lint-staged |
| CI/CD | GitHub Actions |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your GitHub Token and AI API keys

# 3. Run everything
pnpm dev          # Frontend (5173) + Backend (3001) in parallel
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub personal access token (repo scope) |
| `ANTHROPIC_API_KEY` | Yes* | Claude API key for risk analysis |
| `GOOGLE_API_KEY` | Yes* | Gemini API key for summaries |
| `PORT` | No | Backend port (default: 3001) |

\* Required for AI review pipeline. PR metadata/diff works without AI keys.

## Scripts

```bash
# Development
pnpm dev              # Run all apps in parallel
pnpm dev:frontend     # Frontend dev server only (port 5173)
pnpm dev:backend      # Backend dev server only (port 3001)

# Build
pnpm build            # Build all packages and apps
pnpm build:shared     # Build shared package only

# Quality (zero tolerance)
pnpm lint             # Biome check — must pass
pnpm lint:fix         # Auto-fix issues
pnpm typecheck        # TypeScript strict check — must pass
pnpm test             # Run all tests — 97 tests must pass
pnpm test:coverage    # Coverage report

# Git hooks (auto-installed)
# Pre-commit: biome check + format staged files
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/pr/:owner/:repo/:number` | Full PR review (metadata + diff + AI analysis) |
| `POST /api/impact/:owner/:repo/:number` | Impact heatmap only |

## Testing

```bash
pnpm test              # All 97 tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
```

Test files colocated with source:
- `src/services/ast-parser.ts` → `src/services/ast-parser.test.ts`
- `src/services/ai-review-pipeline.ts` → `src/services/ai-review-pipeline.test.ts`

## Git Workflow

1. Branch from `main`: `git checkout -b feat/description`
2. Code + tests
3. `pnpm typecheck && pnpm lint && pnpm test` — all must pass
4. Commit with conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
5. Push and open PR — CI enforces quality gates

## CI Pipeline

GitHub Actions runs on every PR:
1. **Quality** — `pnpm lint` + `pnpm typecheck`
2. **Test** — `pnpm test` (97 tests)
3. **Build** — `pnpm build`

All three must pass before merge.

## License

MIT
