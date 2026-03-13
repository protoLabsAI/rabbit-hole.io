# CLAUDE.md

## Git Workflow

- **Two-branch model**: `dev` (integration) and `main` (production)
- Feature branches are created from `dev` and PR back to `dev`
- Promote to production: merge `dev` → `main` via PR
- No staging branch

## Code Conventions

- **Monorepo**: pnpm workspace + Turborepo
- **Testing**: Vitest, TDD approach
- **Linting**: ESLint flat config with strict import ordering
- Use `getModel()` from `@proto/llm-providers/server` — never import LangChain models directly
- Use `getGlobalPostgresPool()` from `@proto/database` — never create `Pool` directly
- Use `generateSecureId()` from `@proto/utils` — takes no arguments, never use `crypto.randomUUID`

## Project Structure

- `apps/` — Next.js applications (rabbit-hole, playground, etc.)
- `packages/` — Shared libraries (@proto/types, @proto/database, @proto/utils, etc.)
- `services/` — Backend services (job-processor)
- `agent/` — LangGraph agent server
- `custom-domains/` — Entity type definitions
