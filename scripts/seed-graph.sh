#!/usr/bin/env bash
# TraceGraphAI - Idempotent Graph Seeding Script
# Usage: ./scripts/seed-graph.sh [BACKEND_URL]
# Example: ./scripts/seed-graph.sh https://tracegraphai-backend.onrender.com

set -euo pipefail

BACKEND_URL="${1:-http://localhost:8080}"
echo "==> Seeding TraceGraphAI demo microservices graph at: ${BACKEND_URL}"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BACKEND_URL}/api/graph/seed" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS")

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "==> Successfully seeded graph!"
  echo "$BODY"
else
  echo "==> Seeding failed with HTTP $HTTP_STATUS"
  echo "$BODY"
  exit 1
fi
