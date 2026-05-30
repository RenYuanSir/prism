<p align="center">
  <img src="prism.png" width="600" alt="PRism logo">
</p>

<h1 align="center">PRism</h1>
<p align="center">AI-Powered Pull Request Review Assistant</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Express-4-000000" alt="Express">
  <img src="https://img.shields.io/badge/pnpm-10-yellow" alt="pnpm">
  <img src="https://img.shields.io/badge/Vitest-2-green" alt="Vitest">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
</p>

<p align="center">
  <a href="README.md">中文</a>
</p>

---

## What is PRism?

PRism is an AI-powered code review assistant designed for GitHub Pull Requests. It integrates multi-model AI consensus, AST-level semantic analysis, race condition detection, and dependency impact heatmaps into a unified review pipeline — helping developers identify potential risks before merging.

**The name:** Just as a prism disperses white light into a color spectrum, PRism breaks down multi-dimensional code changes in a Pull Request into structured review results. Multiple feature branches (rainbow colors) pass through the analysis pipeline and merge into a unified review report (white light).

## Features

| Feature | Description |
|---|---|
| **Semantic Diff** | Tree-sitter AST parsing — change tracking at function/variable/import/export level |
| **Multi-Model Consensus** | Dual-model parallel risk analysis with consensus voting (file + line ±3 + severity matching) |
| **Race Condition Detection** | Local AST extraction + LLM enrichment, animated timeline visualization of conflict paths |
| **Streaming Display** | SSE progressive rendering — results stream to frontend per pipeline stage as they complete |
| **Impact Heatmap** | Dependency impact graph showing the blast radius of code changes |
| **Review History** | Auto-persist reviews as JSON files with instant cached loading |
| **URL Auto-Parse** | Paste a GitHub PR URL to auto-fill owner/repo/number fields |

## Architecture

```
prism/
├── apps/
│   ├── frontend/       # React 18 + Vite + Tailwind CSS
│   │   ├── src/pages/          # PRList, ReviewResult, HistoryPage, Settings
│   │   ├── src/components/    # ConsensusView, RaceConditionTimeline, ImpactHeatmap, etc.
│   │   └── src/api/           # SSE streaming client + REST API
│   └── backend/        # Node.js + Express
│       └── src/services/
│           ├── ai-review-pipeline.ts      # Multi-stage review pipeline
│           ├── consensus-merger.ts        # Dual-model consensus algorithm
│           ├── race-condition-analyzer.ts # Concurrency pattern detection
│           ├── history-store.ts           # JSON file persistence
│           ├── llm-client.ts / llm-config.ts  # Multi-provider LLM abstraction
│           ├── ast-parser.ts              # Tree-sitter WASM AST analysis
│           ├── diff-analyzer.ts           # Semantic diff analysis
│           ├── impact-analyzer.ts         # Dependency impact graph
│           └── github.ts                  # Octokit REST client
├── packages/
│   └── shared/          # Shared TypeScript types (120+ exported types)
└── pnpm-workspace.yaml  # Monorepo
```

**Review Pipeline:**

```
summary ──▶ parallel risk (Model A + Model B) ──▶ consensus merge ──▶ suggestion
   │              │                │                │               │
   ▼              ▼                ▼                ▼               ▼
 SSE event    SSE events       SSE event        SSE event       SSE event
  Summary     Per-model risk    Consensus       Fix suggestions   Done
```

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >= 18 |
| Language | TypeScript 5.4+ (strict) |
| Package Manager | pnpm >= 8 (monorepo workspace) |
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Backend | Express 4, Tree-sitter WASM, Octokit |
| LLM | OpenAI-compatible interface (DeepSeek, Qwen, Bailian, etc.) |
| Testing | Vitest 2 (120 tests / 11 files) |
| Lint/Format | Biome |
| Git Hooks | Husky 9 + lint-staged |
| CI/CD | GitHub Actions |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your GitHub Token and LLM API keys

# 3. Start development servers
pnpm dev          # Frontend (:5173) + Backend (:3001)
```

## Environment Variables

Each pipeline stage (summary / risk / suggestion) can independently use different LLM providers and models.

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | ✅ | GitHub personal access token |
| `LLM_SUMMARY_PROVIDER` | ✅ | Summary stage provider (e.g., `openai-compatible`) |
| `LLM_SUMMARY_API_KEY` | ✅ | Summary stage API key |
| `LLM_SUMMARY_MODEL` | ✅ | Summary stage model name |
| `LLM_RISK_PROVIDER` | ✅ | Risk analysis provider |
| `LLM_RISK_API_KEY` | ✅ | Risk analysis API key |
| `LLM_RISK_MODEL` | ✅ | Risk analysis model name |
| `LLM_SUGGESTION_PROVIDER` | ✅ | Suggestion generation provider |
| `LLM_SUGGESTION_API_KEY` | ✅ | Suggestion generation API key |
| `LLM_SUGGESTION_MODEL` | ✅ | Suggestion generation model name |
| `LLM_*_BASE_URL` | No | Custom API base URL (for OpenAI-compatible services) |
| `PORT` | No | Backend port (default: 3001) |

**Supported Providers:** `anthropic` | `google` | `openai` | `openai-compatible`

The `openai-compatible` mode supports any OpenAI-compatible API. Set `LLM_*_BASE_URL` to point to your provider's endpoint.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/pr/:owner/:repo/:number` | GET | Get PR metadata, diff, and semantic analysis |
| `/api/review/:owner/:repo/:number` | POST | Full AI review (blocking, single response) |
| `/api/review/:owner/:repo/:number/stream` | POST | SSE streaming AI review (progressive results) |
| `/api/impact/:owner/:repo/:number` | POST | Dependency impact heatmap |
| `/api/history` | GET | Review history list |
| `/api/history/:id` | GET | Get saved review by ID |

## Scripts & Testing

```bash
# Development
pnpm dev              # Start all services
pnpm dev:frontend     # Frontend only (5173)
pnpm dev:backend      # Backend only (3001)

# Build
pnpm build            # Build all packages
pnpm build:shared     # Build shared package only

# Quality
pnpm lint             # Biome check
pnpm lint:fix         # Auto-fix issues
pnpm typecheck        # TypeScript strict check
pnpm test             # Run all 120 tests
pnpm test -- --watch  # Watch mode
```

## CI/CD

GitHub Actions runs on every PR:
1. **Quality** — `pnpm lint` + `pnpm typecheck`
2. **Test** — `pnpm test` (120 tests)
3. **Build** — `pnpm build`

All three must pass before merge.

## Git Workflow

1. Branch from `main`: `git checkout -b feat/description`
2. Code + tests
3. `pnpm typecheck && pnpm lint && pnpm test` — all must pass
4. Commit with conventional commits: `feat:` `fix:` `chore:` `docs:` `test:`
5. Push and open PR — CI enforces quality gates

## License

MIT
