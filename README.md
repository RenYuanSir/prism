# AI PR Review

A full-stack TypeScript application for automated AI-powered pull request reviews.

## Structure

```
ai-pr-review/
├── apps/
│   ├── frontend/    # React + Vite + Tailwind CSS + shadcn/ui
│   └── backend/     # Node.js + Express API server
├── packages/
│   └── shared/      # Shared TypeScript types and utilities
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Prerequisites

- Node.js >= 18
- pnpm >= 8

## Getting Started

```bash
pnpm install
pnpm dev          # Run both frontend and backend in parallel
pnpm dev:frontend # Frontend only
pnpm dev:backend  # Backend only
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Type-check all workspaces |