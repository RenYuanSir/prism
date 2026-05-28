# Contributing

## Git Workflow

1. **Start from `main`** — always branch off an up-to-date `main`
2. **Branch naming**: `feat/description`, `fix/description`, `chore/description`
3. **Commit early and often** — small, focused commits are easier to review
4. **Keep branches short-lived** — merge within a day or two

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add PR diff viewer component
fix: handle empty diff response from API
chore: update dependencies
docs: add setup instructions to README
test: add unit tests for diff parser
refactor: extract token counting into shared util
```

## Before Opening a PR

- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm lint` passes with zero warnings
- [ ] `pnpm test` passes — all tests green
- [ ] New features include tests
- [ ] No commented-out code or debug logs
- [ ] Branch is rebased on latest `main`

## PR Description Template

```markdown
## Summary
<1-3 bullet points describing the change>

## Test Plan
- [ ] Manual verification steps
- [ ] Automated tests pass
```

## Review Checklist

When reviewing a PR, check for:

- **Correctness** — does it do what it claims?
- **Security** — no exposed secrets, no injection vectors, input validated at boundaries
- **Performance** — no N+1 queries, no unnecessary re-renders
- **Simplicity** — no premature abstractions, no dead code, no leftover comments
- **Consistency** — follows existing patterns, uses shared types, named exports

## Code Standards

- TypeScript strict mode — no `any` without explicit justification
- Named exports only — no `export default`
- Imports ordered: external → workspace → relative
- Tests colocated with source: `feature.ts` → `feature.test.ts`