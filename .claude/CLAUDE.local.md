# PRism - Hackathon Auto-Dev Rules

## CRITICAL: Git Workflow
1. NEVER commit directly to main - always work on feature branches
2. Each PR/commit must do ONE thing only
3. Commit message format: `feat:`, `fix:`, `chore:`, `test:`, `refactor:`
4. Before EVERY commit: run `pnpm lint && pnpm typecheck && pnpm test`
5. If any check fails, FIX before committing

## CRITICAL: Code Quality Gates
- Biome lint: ZERO errors allowed
- TypeScript: ZERO type errors (strict mode)
- Tests: ALL must pass
- No `any` types without justification
- Named exports only

## Development Order (DO NOT SKIP)
1. ✅ GitHub API integration (DONE)
2. ✅ AST semantic diff parser (DONE)
3. → AI review pipeline (Gemini Flash + Claude Sonnet)
4. → Frontend dashboard (React + Tailwind)
5. → Cross-file impact heatmap (killer feature)
6. → Demo polish

## Tech Stack
- Backend: Express + TypeScript, @anthropic-ai/sdk, @google/generative-ai
- Frontend: React 18 + Vite + Tailwind + shadcn/ui
- Shared types: packages/shared
- Testing: Vitest
- Lint: Biome

## API Keys (from .env)
- GITHUB_TOKEN
- ANTHROPIC_API_KEY (Claude Sonnet)
- GOOGLE_API_KEY (Gemini Flash)

## When stuck on type errors:
1. Check shared types are exported correctly
2. Run `pnpm build:shared` to refresh type definitions
3. Use `type` imports: `import type { X } from "..."`
4. Add explicit return types to functions
