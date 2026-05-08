#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  GalaxyPulse — Startup Script
#  Starts FastAPI backend (+ Telegram bot) and Next.js frontend dashboard
#
#  Usage:  bash script.sh
#          bash script.sh --no-frontend   (backend + bot only)
#          bash script.sh --no-install    (skip npm/pip install)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SKIP_FRONTEND=false
SKIP_INSTALL=false
for arg in "$@"; do
  [[ "$arg" == "--no-frontend" ]] && SKIP_FRONTEND=true
  [[ "$arg" == "--no-install"  ]] && SKIP_INSTALL=true
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/logs"

mkdir -p "$LOG_DIR"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   🌌  GalaxyPulse — Bringing Live        ║"
echo "  ║   Feedback Intelligence for Galaxy AI    ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${RESET}"

# ── Sync root .env → backend/.env ────────────────────────────────────────────
if [ -f "$ROOT_DIR/.env" ]; then
  info "Syncing root .env → backend/.env"
  cp "$ROOT_DIR/.env" "$BACKEND_DIR/.env"
  success "Environment synced"
else
  warn "No root .env found — using existing backend/.env"
fi

# ── Python check ──────────────────────────────────────────────────────────────
PYTHON="python"
command -v python  &>/dev/null || PYTHON="python3"
command -v $PYTHON &>/dev/null || error "Python not found. Install Python 3.11+ first."
info "Using Python: $($PYTHON --version)"

# ── Virtual environment ───────────────────────────────────────────────────────
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
  info "Creating virtual environment..."
  $PYTHON -m venv venv
fi

# Activate
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  source venv/Scripts/activate
else
  source venv/bin/activate
fi
success "Virtual environment active"

# ── Backend dependencies ───────────────────────────────────────────────────────
if [ "$SKIP_INSTALL" = false ]; then
  info "Installing backend dependencies..."
  pip install --only-binary :all: -r requirements.txt -q
  success "Backend dependencies installed"
fi

# ── Validate environment ──────────────────────────────────────────────────────
OPENROUTER_KEY=$(grep "^OPENROUTER_API_KEY=" "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2)
TG_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN=" "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2)

if [ -z "$OPENROUTER_KEY" ] || [[ "$OPENROUTER_KEY" == *"..."* ]]; then
  warn "OPENROUTER_API_KEY not set in .env — LLM features disabled"
fi
if [ -z "$TG_TOKEN" ] || [[ "$TG_TOKEN" == "YOUR_TELEGRAM_TOKEN" ]]; then
  warn "TELEGRAM_BOT_TOKEN not set — Telegram bot disabled"
else
  success "Telegram bot token found ✓"
fi

# ── Start Backend ─────────────────────────────────────────────────────────────
echo ""
info "Starting FastAPI backend + Telegram bot..."
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --log-level info \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
success "Backend started (PID $BACKEND_PID) → http://localhost:8000"

# Wait for backend to be ready
info "Waiting for backend to be ready..."
for i in {1..20}; do
  sleep 1
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    success "Backend is healthy ✓"
    break
  fi
  if [ $i -eq 20 ]; then
    warn "Backend health check timed out — check logs/backend.log"
  fi
done

# ── Start Frontend ────────────────────────────────────────────────────────────
if [ "$SKIP_FRONTEND" = false ]; then
  echo ""
  if ! command -v node &>/dev/null; then
    warn "Node.js not found — skipping frontend. Install from https://nodejs.org"
  else
    info "Using Node.js: $(node --version)"
    cd "$FRONTEND_DIR"

    if [ "$SKIP_INSTALL" = false ] && [ ! -d "node_modules" ]; then
      info "Installing frontend dependencies..."
      npm install --legacy-peer-deps -q
      success "Frontend dependencies installed"
    fi

    npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    success "Frontend started (PID $FRONTEND_PID) → http://localhost:3000"
  fi
fi

# ── Live summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════${RESET}"
echo -e "${BOLD}  ✅  GalaxyPulse is LIVE!${RESET}"
echo -e "${GREEN}═══════════════════════════════════════════${RESET}"
echo -e "  📡  Backend API   →  ${CYAN}http://localhost:8000${RESET}"
echo -e "  📖  API Docs      →  ${CYAN}http://localhost:8000/docs${RESET}"
if [ "$SKIP_FRONTEND" = false ] && command -v node &>/dev/null; then
echo -e "  🖥️   Dashboard     →  ${CYAN}http://localhost:3000${RESET}"
fi
echo -e "  🤖  Telegram Bot  →  ${CYAN}Send /start to your bot${RESET}"
echo -e "  📜  Backend log   →  ${YELLOW}logs/backend.log${RESET}"
echo -e "  📜  Frontend log  →  ${YELLOW}logs/frontend.log${RESET}"
echo ""
echo -e "  ${BOLD}Demo flow:${RESET}"
echo -e "    1. Open Telegram → message your bot"
echo -e "    2. Send: /use Google Lens"
echo -e "    3. Answer the 2 LLM-generated questions"
echo -e "    4. Watch the dashboard populate in real-time!"
echo ""
echo -e "  ${YELLOW}Press [CTRL+C] to stop all servers${RESET}"
echo -e "${GREEN}═══════════════════════════════════════════${RESET}"

# ── Graceful shutdown ─────────────────────────────────────────────────────────
cleanup() {
  echo ""
  info "Shutting down GalaxyPulse..."
  [ -n "$BACKEND_PID"  ] && kill "$BACKEND_PID"  2>/dev/null && info "Backend stopped"
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && info "Frontend stopped"
  success "All services stopped. Goodbye! 👋"
  exit 0
}

trap cleanup INT TERM
wait
