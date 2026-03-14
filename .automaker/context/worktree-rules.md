# Worktree Rules for rabbit-hole.io

## CRITICAL: No pnpm install or pnpm build in worktrees

This monorepo does NOT have `node_modules` pre-installed. Worktrees share the same constraint.

**DO NOT run any of these commands:**
- `pnpm install`
- `pnpm build`
- `pnpm typecheck`
- `npx tsc`
- Any command that requires `node_modules`

These will either timeout or fail. The CI pipeline handles build verification after PR creation.

## What to do instead

1. **Read existing code** to understand patterns and imports
2. **Write your changes** in the worktree directory
3. **Commit and let the pipeline handle the rest**

## Worktree path

Always work in the worktree, NOT the main repo:
```
/Users/kj/dev/rabbit-hole.io/.worktrees/<branch-name>/
```

## Auth: No Clerk

Clerk has been removed. Do NOT import from `@clerk/nextjs` or `@clerk/nextjs/server`. Use `LocalAuthProvider` from `@proto/auth` if you need a user context, or just use `{ userId: "local-user" }` directly.

## Commit workflow

```bash
cd /Users/kj/dev/rabbit-hole.io/.worktrees/<branch-name>
git add -A
git commit -m "feat: <description>"
```

Do NOT skip committing because a build failed — the build can't run locally.
