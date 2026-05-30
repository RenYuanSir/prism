# PRism

## Project Overview

PRism is a full-stack TypeScript monorepo for automated AI-powered pull request reviews.
It uses a pnpm workspace with three packages: a React frontend, an Express backend, and a shared types package.

## Architecture

```
prism/
├── apps/
│   ├── frontend/    # React 18 + Vite + Tailwind CSS SPA
│   │   ├── src/pages/        # PRList, ReviewResult, Settings, History
│   │   ├── src/components/   # FileChangeCard, ImpactHeatmap, ConsensusView
│   │   └── src/api/          # Backend API client
│   └── backend/     # Node.js + Express API server
│       ├── src/services/     # GitHub, diff-analyzer, ast-parser, AI pipeline
│       └── src/index.ts      # Express routes + dotenv config
├── packages/
│   └── shared/      # Shared TypeScript types and utilities
├── .github/workflows/ci.yml   # GitHub Actions CI
├── biome.json                 # Lint/format config
├── vitest.config.ts           # Test config
└── pnpm-workspace.yaml        # Monorepo workspace
```

### Package Dependencies

- **frontend** depends on `shared` (workspace)
- **backend** depends on `shared` (workspace)
- **shared** has no internal dependencies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 18 |
| Package Manager | pnpm >= 8 |
| Language | TypeScript 5.4+ (strict mode) |
| Frontend | React 18, Vite 5, Tailwind CSS 3, shadcn/ui |
| Backend | Express 4, tsx (dev server), Tree-sitter |
| Testing | Vitest 2 (97 tests across 9 files) |
| Linting/Formatting | Biome |
| Git Hooks | Husky 9 + lint-staged |
| CI/CD | GitHub Actions |

## Commands

```bash
# Development
pnpm dev              # Run all apps in parallel (frontend:5173, backend:3001)
pnpm dev:frontend     # Frontend dev server only
pnpm dev:backend      # Backend dev server only

# Build
pnpm build            # Build all packages and apps
pnpm build:shared     # Build shared package only
pnpm build:frontend   # Build frontend only
pnpm build:backend    # Build backend only

# Quality (zero tolerance policy)
pnpm lint             # Biome check (lint + format) — must pass
pnpm lint:fix         # Biome auto-fix
pnpm format           # Biome format only
pnpm typecheck        # TypeScript type checking (all workspaces) — must pass

# Testing
pnpm test             # Run all tests (vitest run) — 97 tests must pass
pnpm test:watch       # Watch mode
pnpm test:ui          # Vitest UI
pnpm test:coverage    # Run with coverage report
```

## Code Standards

- **TypeScript strict mode** across all packages — no `any` without explicit justification
- **Biome** for linting and formatting — zero warnings, zero errors
- **Vitest** for testing — new features require tests, 97 tests currently passing
- **ESM modules** throughout — `"type": "module"` in all packages
- **No default exports** — use named exports exclusively
- **Shared types** live in `packages/shared/src/`, consumed via `@prism/shared`
- **Colocated tests** — `feature.ts` → `feature.test.ts`

## Git Workflow

1. Create a feature branch from `main`: `git checkout -b feat/description`
2. Write code with tests
3. Ensure `pnpm typecheck` and `pnpm lint` pass
4. Commit using conventional commits (`feat:`, `fix:`, `chore:`, etc.)
5. Push and open a PR against `main`
6. CI must pass before merge (lint → typecheck → test → build)

## Environment Variables

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `GITHUB_TOKEN` | backend | Yes | GitHub personal access token (repo scope) |
| `ANTHROPIC_API_KEY` | backend | Yes* | Claude API key for risk analysis |
| `GOOGLE_API_KEY` | backend | Yes* | Gemini API key for summaries |
| `PORT` | backend | No | Server port (default: 3001) |
| `NODE_ENV` | backend | No | Environment mode |

\* Required for AI review pipeline. PR metadata/diff endpoints work without AI keys.

## Backend Services

| Service | File | Purpose |
|---------|------|---------|
| GitHubService | `github.ts` | GitHub API client (PR metadata, diff, files) |
| DiffAnalyzer | `diff-analyzer.ts` | Parse GitHub diff into semantic structure |
| ASTParser | `ast-parser.ts` | Tree-sitter based code analysis |
| AIReviewPipeline | `ai-review-pipeline.ts` | Claude + Gemini orchestration |
| ConsensusMerger | `consensus-merger.ts` | Multi-model agreement detection |
| ImpactAnalyzer | `impact-analyzer.ts` | Dependency impact graph generation |
| RaceConditionAnalyzer | `race-condition-analyzer.ts` | Async concurrency risk detection |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/pr/:owner/:repo/:number` | Full PR review with AI analysis |
| POST | `/api/impact/:owner/:repo/:number` | Impact heatmap only |

## Testing

- Unit tests alongside source: `src/foo.test.ts`
- Integration tests in `tests/` directories
- Run `pnpm test` before pushing — CI enforces this
- Current coverage: 97 tests across 9 test files, all passing

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`):
1. **Quality** job — `pnpm lint` + `pnpm typecheck`
2. **Test** job — `pnpm test` (depends on quality)
3. **Build** job — `pnpm build` (depends on test)

All jobs must pass. Concurrency control cancels in-progress runs.
