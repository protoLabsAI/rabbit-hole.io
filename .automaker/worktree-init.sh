#!/bin/bash
# Worktree init script — runs once after each worktree is created
# Installs dependencies so pre-push hooks (lint, type-check, build) work

echo "Installing dependencies..."
pnpm install --frozen-lockfile
