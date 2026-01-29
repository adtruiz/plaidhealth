#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

echo "Checking ${BASE_URL}/health"
curl -fsS "${BASE_URL}/health" | jq .

echo "Checking ${BASE_URL}/health/redis"
curl -fsS "${BASE_URL}/health/redis" | jq .

echo "Checking ${BASE_URL}/ready"
curl -fsS "${BASE_URL}/ready" | jq .

echo "Health checks complete."
