#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
SESSION_COOKIE="${2:-}"
CONNECTION_ID="${3:-0}"

if [[ -z "${SESSION_COOKIE}" ]]; then
  echo "Usage: $0 <base_url> <session_cookie_value> [connection_id]"
  echo "Example: $0 https://your-api.example.com 'verzihealth.sid=...' 0"
  exit 1
fi

echo "Fetching CSRF token from ${BASE_URL}/api/csrf"
CSRF_TOKEN="$(curl -fsS -H "Cookie: ${SESSION_COOKIE}" "${BASE_URL}/api/csrf" | jq -r '.csrf_token')"

if [[ -z "${CSRF_TOKEN}" || "${CSRF_TOKEN}" == "null" ]]; then
  echo "Failed to retrieve CSRF token. Ensure the session cookie is valid."
  exit 1
fi

echo "CSRF token acquired."
echo "Validating CSRF protection (expected 403 without token)..."
STATUS_NO_TOKEN="$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "Cookie: ${SESSION_COOKIE}" "${BASE_URL}/api/epic-connections/${CONNECTION_ID}")"
if [[ "${STATUS_NO_TOKEN}" != "403" ]]; then
  echo "Expected 403 without CSRF token, got ${STATUS_NO_TOKEN}"
  exit 1
fi

echo "Validating CSRF protection (with token)..."
STATUS_WITH_TOKEN="$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Cookie: ${SESSION_COOKIE}" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  "${BASE_URL}/api/epic-connections/${CONNECTION_ID}")"

if [[ "${STATUS_WITH_TOKEN}" == "403" ]]; then
  echo "CSRF token was rejected."
  exit 1
fi

echo "CSRF check complete. Status with token: ${STATUS_WITH_TOKEN}"
