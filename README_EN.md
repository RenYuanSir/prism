<p align="center">
  <img src="prism.png" width="800" alt="PRism logo">
</p>
<p align="center"><strong>AI-Powered GitHub Pull Request Code Review Platform</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0-8b5cf6" alt="v1.0">
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Express-4-000000" alt="Express">
  <img src="https://img.shields.io/badge/pnpm-10-yellow" alt="pnpm">
  <img src="https://img.shields.io/badge/Vitest-2-green" alt="Vitest">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
  <a href="README.md"><img src="https://img.shields.io/badge/README-中文-ff6f00" alt="中文"></a>
</p>

---

<p align="center"><strong>Watch the demo:</strong></p>

<p align="center">
  <a href="https://www.bilibili.com/video/BV1y6VU6jEdC?vd_source=4958599fc247ce0b6bf3dac98a708afe" target="_blank">
    <img src="https://img.shields.io/badge/▶_Demo_Bilibili-00A1D6?style=for-the-badge&logo=bilibili&logoColor=white&labelColor=FB7299" alt="Demo on Bilibili">
  </a>
</p>

---

## What is PRism?

PRism is an AI-powered code review assistant designed for GitHub Pull Requests. It integrates **multi-model AI consensus**, **AST-level semantic analysis**, **race condition detection**, and **dependency impact heatmaps** into a unified review pipeline — streaming results to the frontend in real-time via SSE, helping developers identify potential risks before merging.

**The name:** Just as a prism disperses white light into a color spectrum, PRism breaks down multi-dimensional code changes in a Pull Request into structured review results. Multiple feature branches (rainbow colors) pass through the analysis pipeline and merge into a unified review report.

## Core Design Philosophy

### Augmenting Humans, Not Replacing Them

The greatest value of an AI review tool does not lie in "replacing human review" — it lies in **letting reviewers spend their limited time on problems that genuinely require human judgment**. PRism does not output ESLint-level style suggestions. It focuses on deep semantic analysis: race conditions, cross-module dependency breakage, logic flaws, and subtle defects in AI-generated code. Every finding comes with an **explainable reasoning trail**, so reviewers understand *why* something is a problem rather than blindly trusting an AI verdict.

### Model Selection Strategy: Heterogeneous Complementarity > Single Best

The 2026 LLM landscape shows clearly: **no single model wins across all dimensions**. Claude excels at multi-file logical reasoning but is expensive; fine-tuned fast models have high recall for common defect patterns but may miss complex edge cases.

PRism employs a **four-role architecture** — not merely "calling the API a few more times", but matching the most suitable capability to each stage:

| Stage | Model Role | Recommended Model | Rationale |
|------|---------|---------|---------|
| **Summary** | Quick overview | `deepseek-v4-pro` | Needs accurate PR intent understanding; large models provide more stable long-context comprehension |
| **Risk (Model 1)** | Primary risk scan | `deepseek-v4-flash` | Fast, low-cost, good coverage of common defect patterns |
| **Risk (Model 2)** | Cross-validation | `gemini-3.5-flash` | Heterogeneous with Model 1; provides a different analytical perspective to strengthen consensus reliability |
| **Suggestion** | Fix generation | `claude-sonnet-4-6` | Code generation scenarios demand the strongest code understanding and synthesis capability |

The two Risk models run in parallel, then their findings are cross-validated via a **consensus merge algorithm** (file + line ±3 + severity matching). Findings confirmed by both models are marked as Consensus; findings from only one model are listed separately for human review. The core value of this approach is **false positive control**: a single model may hallucinate, but two heterogeneous models independently agreeing on the same line of code makes a false positive extremely unlikely.

### Context Acquisition: Three-Layer Progressive Strategy

Review depth vs. context scope is a fundamental trade-off — more context means more thorough analysis, but also higher token consumption and latency. PRism uses a **layered context strategy**:

```
Layer 1: Intra-file Context
  └── AST parsing → function/class-level semantic change descriptions → feed to LLM
  └── Instead of raw git diff text
  └── Implementation: Tree-sitter WASM

Layer 2: Call-chain Analysis
  └── Cross-file import/export dependency graph construction
  └── Identify all callers and callees of changed functions
  └── Implementation: impact-analyzer (static dependency tracking)

Layer 3: Concurrency Context
  └── Async functions + Promise chains + shared state access pattern extraction
  └── Injected into Risk stage prompts
  └── Implementation: race-condition-analyzer
```

The significance of this strategy: Layer 1 answers "what did this function change" (accuracy), Layer 2 answers "who will be affected" (context understanding), Layer 3 answers "what could go wrong under concurrency" (deep reasoning). The three layers together do not require full-repository indexing, keeping token consumption manageable while demonstrating analytical capability far beyond conventional diff-based review.

### Future Roadmap

```
Current (v1.0)
├── Semantic Diff (Tree-sitter AST)
├── 4-Model Pipeline (Summary → Risk×2 → Consensus → Suggestion)
├── Race Condition Detection + Execution Path Visualization
├── Cross-File Impact Heatmap (static dependency analysis)
├── SSE Streaming Real-Time Rendering
├── Review History Persistence + Settings Management
├── Light/Dark Theme + Prism WebGL Spectral Background
├── Liquid Glass UI Components (app-wide glassmorphism)
├── Incremental Review (per-push updates, analyze new changes only)
├── Historical Similar PR Risk Warning (vector embedding + similarity search)
├── Review Quality Self-Scoring & Trend Analysis
├── Enhanced Consensus Confidence Visualization
├── PR Comment Auto-Post to GitHub (GitHub Suggestion format)
└── LLM Pipeline Config Panel (6 presets + API key persistence)

V2 (Mid-term Vision)
├── GitLab + Gitee Support

V2 (Mid-term Vision)
├── IDE Plugin (VS Code Extension)
├── Team Custom Review Rules (YAML configuration)
├── AI-Generated Code Specialist Review (hallucination detection: non-existent API calls, undefined symbols)
├── Runtime Behavior Analysis Integration (optional dynamic analysis)
└── Open API + Webhook Event Stream
```

## Features

| Feature | Description |
|---|---|
| **Semantic Diff** | Tree-sitter WASM AST parsing — function/import/export level change tracking, not text diff |
| **Multi-Model Consensus** | Dual-model parallel risk analysis + consensus voting (file + line ±3 + severity matching), reducing false positives |
| **Race Condition Detection** | Local AST concurrency pattern extraction + LLM-enriched execution paths, animated timeline visualization |
| **Impact Heatmap** | Dependency graph via import/export analysis, impact scoring + drill-down detail panel |
| **SSE Streaming** | Server-Sent Events progressive rendering — pipeline results stream to frontend as each stage completes |
| **Review History** | Auto-persist reviews as JSON on completion, instant cached reload for past reviews |
| **URL Auto-Parse** | Paste a GitHub PR URL to auto-extract owner/repo/number, supporting multiple URL formats |
| **Light/Dark Theme** | Full dual-color-system, WebGL prism spectral background + liquid glass UI + fixed background (scroll-independent) |
| **Liquid Glass UI** | App-wide glassmorphism components, RAF-driven CSS backdrop-filter liquid flow animation, dark/light mode adaptive |
| **LLM Settings** | Four-stage independent Provider config (6 presets + Custom), API Key security masking, backend persistence |
| **Incremental Review** | Per-push incremental updates, analyze new changes only, historical result cache reuse |
| **Similar PR Warning** | Vector embedding + cosine similarity search, auto-match historical similar PR risks during review |
| **Review Score** | Review quality self-scoring (risk, consensus, coverage), trend tracking |
| **GitHub Comment** | Auto-post review results as GitHub PR comments (GitHub Suggestion format) |

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >= 18 |
| Language | TypeScript 5.4 (strict mode) |
| Package Manager | pnpm >= 8 (monorepo workspace) |
| Frontend | React 18, Vite 5, Tailwind CSS 3, framer-motion |
| Backend | Express 4, Tree-sitter WASM, Octokit |
| LLM Abstraction | Unified interface supporting Anthropic / Google / OpenAI / OpenAI-compatible |
| Testing | Vitest 2 (178 tests / 18 files) |
| WebGL | ogl (lightweight WebGL library, Prism spectral background) |
| Vector Search | Embedding Service + cosine similarity (historical PR matching) |
| Lint/Format | Biome |
| Git Hooks | Husky 9 + lint-staged (pre-commit: format + typecheck + test) |
| CI/CD | GitHub Actions (Quality → Test → Build) |

## Architecture

```
prism/
├── apps/
│   ├── frontend/          # React 18 + Vite 5 + Tailwind CSS
│   │   ├── src/pages/             # PRList, ReviewResult, HistoryPage, SettingsPage
│   │   ├── src/components/        # LiquidGlass, Prism (WebGL), ConsensusView, RaceConditionTimeline, ImpactHeatmap, etc.
│   │   └── src/api/               # SSE streaming client + REST API
│   └── backend/           # Node.js + Express
│       └── src/services/
│           ├── ai-review-pipeline.ts        # Multi-stage pipeline (summary → risk×2 → consensus → suggestion)
│           ├── consensus-merger.ts          # Dual-model consensus algorithm (file + line ±3 + severity)
│           ├── race-condition-analyzer.ts   # Concurrency pattern extraction & candidate detection
│           ├── impact-analyzer.ts           # Cross-file dependency graph & impact scoring
│           ├── diff-analyzer.ts             # AST semantic diff analysis
│           ├── ast-parser.ts                # Tree-sitter WASM parser (TS/TSX/JS)
│           ├── llm-client.ts                # Multi-provider LLM abstraction (Anthropic/Google/OpenAI)
│           ├── llm-config.ts                # Four-stage Provider config + caching
│           ├── history-store.ts             # Review result JSON persistence
│           ├── settings-store.ts            # LLM settings JSON persistence
│           ├── embedding-service.ts         # Review text vectorization (historical PR matching)
│           ├── similarity-service.ts        # Cosine similarity search
│           ├── incremental-review-service.ts # Incremental review (new changes only)
│           ├── review-scorer.ts             # Review quality self-scoring
│           ├── pr-comment-service.ts        # Auto-post review comments to GitHub
│           └── github.ts                    # Octokit REST client
├── packages/
│   └── shared/             # Shared TypeScript types (120+ types) + utilities
└── pnpm-workspace.yaml     # Monorepo
```

**Review Pipeline:**

```
  ┌──────────┐     ┌─────────────────────┐     ┌───────────┐     ┌────────────┐
  │ Summary  │ ──▶ │   Risk (parallel)    │ ──▶ │ Consensus │ ──▶ │ Suggestion │
  │          │     │  Model 1 │ Model 2   │     │   Merge   │     │            │
  └──────────┘     └─────────────────────┘     └───────────┘     └────────────┘
       │               │          │                 │                 │
       ▼               ▼          ▼                 ▼                 ▼
   SSE event       SSE events  SSE event       SSE event         SSE event
    Summary       Model findings  Consensus     Fix suggestions     Done
```

Each event is pushed to the frontend in real-time via SSE, with AbortController support for cancellation.

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

Each pipeline stage (summary / risk / gemini / suggestion) can independently use different LLM providers and models.

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | ✅ | GitHub personal access token |
| `LLM_SUMMARY_PROVIDER` | ✅ | Summary stage provider |
| `LLM_SUMMARY_API_KEY` | ✅ | Summary stage API key |
| `LLM_SUMMARY_MODEL` | ✅ | Summary stage model name |
| `LLM_RISK_PROVIDER` | ✅ | Risk Model 1 provider |
| `LLM_RISK_API_KEY` | ✅ | Risk Model 1 API key |
| `LLM_RISK_MODEL` | ✅ | Risk Model 1 model name |
| `LLM_GEMINI_PROVIDER` | ✅ | Risk Model 2 provider |
| `LLM_GEMINI_API_KEY` | ✅ | Risk Model 2 API key |
| `LLM_GEMINI_MODEL` | ✅ | Risk Model 2 model name |
| `LLM_SUGGESTION_PROVIDER` | ✅ | Suggestion generation provider |
| `LLM_SUGGESTION_API_KEY` | ✅ | Suggestion generation API key |
| `LLM_SUGGESTION_MODEL` | ✅ | Suggestion generation model name |
| `LLM_*_BASE_URL` | No | Custom API base URL (for OpenAI-compatible services) |
| `PORT` | No | Backend port (default: 3001) |

**Supported Providers:** `anthropic` | `google` | `openai` | `openai-compatible`

The `openai-compatible` mode supports any OpenAI-compatible API (DeepSeek, Qwen, Bailian, Kimi, etc.). Set `LLM_*_BASE_URL` to point to your provider's endpoint.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/pr/:owner/:repo/:number` | GET | Get PR metadata, raw diff, and semantic analysis |
| `/api/review/:owner/:repo/:number` | POST | Full AI review (blocking, single response) |
| `/api/review/:owner/:repo/:number/stream` | POST | SSE streaming AI review (progressive real-time results) |
| `/api/impact/:owner/:repo/:number` | POST | Cross-file dependency impact heatmap |
| `/api/history` | GET | Review history list (recent 100 entries) |
| `/api/history/:id` | GET | Get full saved review details by ID |
| `/api/settings` | GET | Get LLM config (API keys masked for security) |
| `/api/settings` | POST | Save LLM config (with API keys, persisted to disk) |

## Scripts & Testing

```bash
# Development
pnpm dev              # Start frontend + backend
pnpm dev:frontend     # Frontend only (localhost:5173)
pnpm dev:backend      # Backend only (localhost:3001)

# Build
pnpm build            # Build all packages
pnpm build:shared     # Build shared package only

# Quality
pnpm lint             # Biome check
pnpm lint:fix         # Auto-fix issues
pnpm typecheck        # TypeScript strict check
pnpm test             # Run all 140 tests
pnpm test -- --watch  # Watch mode
```

## CI/CD

GitHub Actions runs three quality gates on every PR — all must pass before merge:

1. **Quality** — `pnpm lint` + `pnpm typecheck`
2. **Test** — `pnpm test` (178 tests / 18 files)
3. **Build** — `pnpm build`

## Contributing

1. Branch from `main`: `git checkout -b feat/description`
2. Code + tests
3. `pnpm typecheck && pnpm lint && pnpm test` — all must pass
4. Use Conventional Commits: `feat:` `fix:` `chore:` `docs:` `test:`
5. Push and open a PR — CI enforces quality gates
6. Delete branch after merge

## License

MIT
