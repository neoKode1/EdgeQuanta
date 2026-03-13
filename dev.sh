#!/usr/bin/env bash
# ─────────────────────────────────────────────
# EdgeQuanta Development Server
# Starts both backend (FastAPI) and frontend (Vite)
# Usage:  ./dev.sh
# ─────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Load .env if present
if [ -f .env ]; then
  echo "✓ .env loaded"
else
  echo "⚠ No .env file found — copy .env.example to .env and add your keys"
fi

# Check dependencies
command -v python3 >/dev/null 2>&1 || { echo "✗ python3 not found"; exit 1; }
command -v node >/dev/null 2>&1    || { echo "✗ node not found"; exit 1; }

# Install frontend deps if needed
if [ ! -d frontend/node_modules ]; then
  echo "→ Installing frontend dependencies…"
  (cd frontend && npm install)
fi

# Build frontend
echo "→ Building frontend…"
(cd frontend && npx vite build)

# Start backend (serves SPA + API)
PORT=${PORT:-8080}
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EDGE QUANTA running on http://localhost:$PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

uvicorn server:app --reload --port "$PORT"

