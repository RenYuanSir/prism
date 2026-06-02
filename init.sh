#!/bin/bash
set -e

echo "=== PRism Harness Initialization ==="
echo ""

# 1. Install dependencies
echo "[1/6] Installing dependencies..."
pnpm install --frozen-lockfile
echo ""

# 2. Build shared package (prerequisite for both apps)
echo "[2/6] Building shared package..."
pnpm build:shared
echo ""

# 3. TypeScript check
echo "[3/6] TypeScript strict typecheck..."
pnpm typecheck
echo ""

# 4. Lint check
echo "[4/6] Biome lint check..."
pnpm lint
echo ""

# 5. Tests
echo "[5/6] Running tests..."
pnpm test
echo ""

# 6. Build
echo "[6/6] Building all packages..."
pnpm build
echo ""

echo "=== Verification Complete ==="
echo ""
echo "All checks passed: install -> shared -> typecheck -> lint -> test -> build"
echo ""
echo "Next steps:"
echo "  1. cat feature_list.json        — see current feature state"
echo "  2. Pick ONE unfinished feature"
echo "  3. Implement only that feature"
echo "  4. pnpm dev                     — start dev servers (:5173 + :3001)"
echo "  5. Re-run: ./init.sh            — before claiming done"
echo ""
