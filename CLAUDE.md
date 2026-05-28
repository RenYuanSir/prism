# CLAUDE.md

## Project Overview

AI PR Review is a full-stack TypeScript monorepo for automated AI-powered pull request reviews.
It uses a pnpm workspace with three packages: a React frontend, an Express backend, and a shared types package.

## Architecture

```
ai-pr-review/
├── apps/
│   ├── frontend/    # React 18 + Vite + Tailwind CSS SPA
│   └── backend/     # Node.js + Express API server
├── packages/
│   └── shared/      # Shared TypeScript types and utilities
├── .github/
│   └── workflows/   # CI/CD pipelines
├── biome.json       # Biome linter/formatter config
├── vitest.config.ts # Root vitest configuration
└── tsconfig.base.json
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
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Backend | Express 4, tsx (dev server) |
| Testing | Vitest 2 |
| Linting/Formatting | Biome |
| Git Hooks | Husky 9 + lint-staged |
| CI/CD | GitHub Actions |

## Commands

```bash
# Development
pnpm dev              # Run all apps in parallel
pnpm dev:frontend     # Frontend dev server only
pnpm dev:backend      # Backend dev server only

# Build
pnpm build            # Build all packages and apps
pnpm build:shared     # Build shared package only

# Quality
pnpm lint             # Biome check (lint + format)
pnpm lint:fix         # Biome auto-fix
pnpm format           # Biome format only
pnpm typecheck        # TypeScript type checking (all workspaces)

# Testing
pnpm test             # Run all tests (vitest run)
pnpm test:watch       # Watch mode
pnpm test:ui          # Vitest UI
pnpm test:coverage    # Run with coverage report
```

## Code Standards

- **TypeScript strict mode** across all packages — no `any` without explicit justification
- **Biome** for linting and formatting — zero warnings, zero errors
- **Vitest** for testing — new features require tests
- **ESM modules** throughout — `"type": "module"` in all packages
- **No default exports** — use named exports exclusively
- **Shared types** live in `packages/shared/src/`, consumed via `@ai-pr-review/shared`

## Git Workflow

1. Create a feature branch from `main`: `git checkout -b feat/description`
2. Write code with tests
3. Ensure `pnpm typecheck` and `pnpm lint` pass
4. Commit using conventional commits (`feat:`, `fix:`, `chore:`, etc.)
5. Push and open a PR against `main`
6. CI must pass before merge

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `PORT` | backend | Server port (default: 3000) |
| `NODE_ENV` | backend | Environment mode |

## Testing

- Unit tests alongside source: `src/foo.test.ts`
- Integration tests in `tests/` directories
- Run `pnpm test` before pushing — CI enforces this