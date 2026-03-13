#!/bin/bash
set -e

echo "🔨 Pre-deployment: Building workspace packages for Docker..."

# Build all workspace packages (Turbo handles dependency order)
pnpm run build:libs

echo "✅ Workspace packages built successfully!"
echo "📦 Ready for Docker image build"

