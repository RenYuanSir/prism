# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ PR List  │  │ Review Result│  │ Settings │  │  History   │  │
│  └──────────┘  └──────────────┘  └──────────┘  └────────────┘  │
│                                                                  │
│  Components: FileChangeCard, ImpactHeatmap, ConsensusView,      │
│              RaceConditionTimeline, SeverityBadge               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP /api
┌──────────────────────────▼──────────────────────────────────────┐
│                      Backend (Express)                           │
│                                                                  │
│  Routes:                                                         │
│    GET  /api/health                                              │
│    GET  /api/pr/:owner/:repo/:number  → Full review pipeline    │
│    POST /api/impact/:owner/:repo/:number → Impact analysis only │
│                                                                  │
│  Services:                                                       │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│    │ GitHubService│  │ DiffAnalyzer │  │  ASTParser   │        │
│    └──────────────┘  └──────────────┘  └──────────────┘        │
│           │                   │                   │              │
│           ▼                   ▼                   ▼              │
│    ┌──────────────────────────────────────────────────────┐     │
│    │              AI Review Pipeline                       │     │
│    │  ┌──────────────┐  ┌──────────────┐                 │     │
│    │  │   Claude     │  │   Gemini     │                 │     │
│    │  │ (risk/issues)│  │ (summary)    │                 │     │
│    │  └──────────────┘  └──────────────┘                 │     │
│    │           │                │                        │     │
│    │           ▼                ▼                        │     │
│    │  ┌──────────────────────────────────────┐          │     │
│    │  │        ConsensusMerger                │          │     │
│    │  │  (agreement detection + conflicts)    │          │     │
│    │  └──────────────────────────────────────┘          │     │
│    └──────────────────────────────────────────────────────┘     │
│                           │                                      │
│    ┌──────────────────────┼──────────────────────┐              │
│    ▼                      ▼                      ▼              │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│ │ImpactAnalyzer│  │RaceCondition │  │   Review Response    │  │
│ │ (heatmap)    │  │  Analyzer    │  │   (JSON to client)   │  │
│ └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Full PR Review Flow

```
1. Client → GET /api/pr/facebook/react/28735
2. Backend:
   a. GitHubService.fetchPR()      → PR metadata + files
   b. GitHubService.fetchDiff()    → raw diff text
   c. DiffAnalyzer.parse()         → semantic diff (imports, functions, etc.)
   d. ASTParser.analyze()          → AST-level changes
   e. AIReviewPipeline.run()       → Claude + Gemini in parallel
   f. ConsensusMerger.merge()      → detect agreements/disagreements
   g. ImpactAnalyzer.analyze()     → dependency graph
   h. RaceConditionAnalyzer.check() → async risks
3. Backend → JSON response
4. Frontend renders ReviewResult page
```

## Key Design Decisions

1. **Monorepo with pnpm workspaces** — Shared types between frontend/backend
2. **Tree-sitter for AST parsing** — Multi-language support (JS/TS/Python/Java)
3. **Dual-model AI pipeline** — Claude (deep analysis) + Gemini (fast summary)
4. **Consensus detection** — Highlights where models agree/disagree
5. **Impact heatmap** — Call graph analysis for blast radius visualization
6. **Race condition detection** — Pattern matching on async/await, Promise, setTimeout
