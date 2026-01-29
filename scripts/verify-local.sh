#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== API tests =="
cd "$ROOT_DIR/apps/api"
npm test

echo "== Developer Portal typecheck =="
cd "$ROOT_DIR/apps/developer-portal"
npx tsc --noEmit

echo "== Marketing Site typecheck =="
cd "$ROOT_DIR/apps/marketing-site"
npx tsc --noEmit

echo "All checks passed."
