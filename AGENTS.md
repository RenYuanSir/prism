# AGENTS.md

PRism — AI-driven GitHub Pull Request code review platform with multi-model consensus.

## Startup Workflow

Before writing any code:

1. **Read this file** completely
2. **Read `docs/ARCHITECTURE.md`** or README architecture section for system map
3. **Run `./init.sh`** to verify environment is healthy
4. **Read `feature_list.json`** to see current feature state
5. **Review recent commits** with `git log --oneline -10`

If baseline verification fails, repair that first before adding new scope.

## Project Layout

```
prism/
├── apps/
│   ├── frontend/          # React 18 + Vite 5 + Tailwind CSS 3
│   │   └── src/
│   │       ├── pages/      # PRList, ReviewResult, HistoryPage, SettingsPage
│   │       ├── components/ # ConsensusView, RaceConditionTimeline, ImpactHeatmap, etc.
│   │       └── api/        # SSE streaming client + REST API
│   ├── backend/           # Node.js + Express 4
│   │   └── src/services/
│   │       ├── ai-review-pipeline.ts   # Multi-stage review pipeline
│   │       ├── consensus-merger.ts     # Dual-model consensus match algorithm
│   │       ├── race-condition-analyzer.ts  # Race condition pattern extraction
│   │       ├── impact-analyzer.ts      # Cross-file dependency graph + impact scoring
│   │       ├── diff-analyzer.ts        # AST semantic diff analysis
│   │       ├── ast-parser.ts           # Tree-sitter WASM parser (TS/TSX/JS)
│   │       ├── llm-client.ts           # Multi-vendor LLM abstraction layer
│   │       ├── llm-config.ts           # Per-stage Provider config + cache
│   │       ├── history-store.ts        # Review result JSON file persistence
│   │       ├── settings-store.ts       # LLM settings JSON file persistence
│   │       └── github.ts              # Octokit REST client
├── packages/
│   └── shared/            # Shared TypeScript types (120+ types) + utility functions
└── docs/
    ├── API.md             # API endpoint documentation
    ├── DEPLOYMENT.md      # Deployment guide
    └── LLM_PROVIDERS.md   # LLM provider configuration guide
```

## Working Rules

- **One feature at a time**: Pick exactly one unfinished feature from `feature_list.json`
- **Build shared first**: `pnpm build:shared` before testing frontend/backend changes
- **Verification required**: Run `pnpm typecheck && pnpm lint && pnpm test` before claiming done
- **Update artifacts**: Before ending session, update `progress.md` and `feature_list.json`
- **Stay in scope**: Don't modify files unrelated to the current feature
- **Leave clean state**: Next session must be able to run `./init.sh` immediately
- **Strict TypeScript**: All files are strict mode — no `any` overrides, no unsafe type casts
- **Test alongside**: New service logic always gets a corresponding `.test.ts` file
- **No dead code**: Remove unused imports, dead variables, commented-out code

## Required Artifacts

- `feature_list.json` — Feature state tracker (source of truth)
- `progress.md` — Session continuity log
- `init.sh` — Standard startup and verification
- `session-handoff.md` — For multi-session features

## Definition of Done

A feature is done ONLY when ALL of the following are true:

- [ ] Target behavior is implemented and complete
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm test` passes (all 140 tests, plus new tests for added behavior)
- [ ] `pnpm build` passes (shared → backend → frontend)
- [ ] Evidence recorded in `feature_list.json` status/evidence fields
- [ ] Repository remains restartable: `./init.sh` runs clean

## Verification Commands

```bash
# Full initialization + verification (recommended)
./init.sh

# Individual checks
pnpm build:shared           # Build shared package (dependency for both apps)
pnpm lnt                    # Biome lint check (use pnpm lint:fix to auto-fix)
pnpm typecheck              # TypeScript strict type check
pnpm test                   # Vitest (140 tests / 13 files)
pnpm build                  # Full production build

# Start development
pnpm dev                    # Frontend (:5173) + Backend (:3001) parallel
pnpm dev:frontend           # Frontend only
pnpm dev:backend            # Backend only
```

## CI Pipeline

GitHub Actions enforces three gates on every PR (all must pass before merge):

1. **Quality** — `pnpm lint` + `pnpm typecheck`
2. **Test** — `pnpm test`
3. **Build** — `pnpm build`

Pre-commit hooks enforce: lint-staged → typecheck → test

## Common Patterns

### Adding a new API endpoint

1. Define types in `packages/shared/src/index.ts` if shared
2. Add route + handler in `apps/backend/src/index.ts`
3. Add client function in `apps/frontend/src/api/client.ts`
4. Build shared: `pnpm build:shared`

### Adding a new backend service

1. Create `apps/backend/src/services/your-service.ts`
2. Create corresponding `apps/backend/src/services/your-service.test.ts`
3. Export and use from `index.ts` or pipeline

### Adding a new frontend component

1. Create `apps/frontend/src/components/YourComponent.tsx`
2. Import and use from the appropriate page
3. Use Tailwind classes for styling, framer-motion for animations
4. Follow existing glass-surface / linear-text design tokens

### LLM Client Configuration

Each pipeline stage (summary / risk / gemini / suggestion) can use a different provider:
`anthropic` | `google` | `openai` | `openai-compatible`

Configured via `.env` or the Settings UI. See `docs/LLM_PROVIDERS.md` for details.

## End of Session

Before ending a session:

1. Update `progress.md` with current state and decisions
2. Update `feature_list.json` with new feature statuses
3. Record any unresolved risks or blockers in `session-handoff.md`
4. Commit with a descriptive Conventional Commit message (`feat:`, `fix:`, `chore:`, etc.)
5. Leave repo clean enough for next session to run `./init.sh` immediately
