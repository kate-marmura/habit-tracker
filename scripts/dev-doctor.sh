#!/usr/bin/env bash
#
# dev-doctor.sh — Validate the habit-tracker development environment.
#
# Usage:  ./scripts/dev-doctor.sh          (all checks)
#         ./scripts/dev-doctor.sh --quick   (skip runtime / Docker checks)
#
# Exit 0 = all critical checks passed, 1 = at least one failure.

set -euo pipefail

# ─── Colours & symbols ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

PASS="${GREEN}✔ PASS${RESET}"
FAIL="${RED}✘ FAIL${RESET}"
WARN="${YELLOW}⚠ WARN${RESET}"
SKIP="${CYAN}⊘ SKIP${RESET}"

FAILURES=0
WARNINGS=0

pass()  { printf "  %b  %s\n" "$PASS" "$1"; }
fail()  { printf "  %b  %s\n" "$FAIL" "$1"; FAILURES=$((FAILURES + 1)); }
warn()  { printf "  %b  %s\n" "$WARN" "$1"; WARNINGS=$((WARNINGS + 1)); }
skip()  { printf "  %b  %s\n" "$SKIP" "$1"; }
hint()  { printf "         ↳ %s\n" "$1"; }
header(){ printf "\n${BOLD}── %s ──${RESET}\n" "$1"; }

QUICK=false
[[ "${1:-}" == "--quick" ]] && QUICK=true

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

printf "\n${BOLD}🩺 Habit Tracker Dev Doctor${RESET}\n"
printf "   Root: %s\n" "$ROOT_DIR"

# ─── 1. Toolchain ─────────────────────────────────────────────────────
header "Toolchain"

if command -v node &>/dev/null; then
  NODE_V="$(node -v)"
  MAJOR="${NODE_V#v}"
  MAJOR="${MAJOR%%.*}"
  if [[ "$MAJOR" -ge 22 ]]; then
    pass "Node.js $NODE_V (≥ 22 required)"
  else
    fail "Node.js $NODE_V found — v22+ required"
    hint "Install via nvm: nvm install 22 && nvm use 22"
  fi
else
  fail "Node.js not found"
  hint "Install Node 22 LTS: https://nodejs.org"
fi

if command -v npm &>/dev/null; then
  pass "npm $(npm -v)"
else
  fail "npm not found"
fi

if command -v docker &>/dev/null; then
  pass "Docker $(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
else
  fail "Docker not found"
  hint "Install Docker Desktop: https://docs.docker.com/get-docker/"
fi

if docker compose version &>/dev/null 2>&1; then
  pass "Docker Compose $(docker compose version --short 2>/dev/null || echo 'available')"
else
  fail "Docker Compose not available"
  hint "Docker Desktop includes Compose v2; ensure it is enabled."
fi

# ─── 2. Environment file ──────────────────────────────────────────────
header "Environment"

if [[ -f .env ]]; then
  pass ".env file exists"

  REQUIRED_VARS=(DATABASE_URL JWT_SECRET)
  for var in "${REQUIRED_VARS[@]}"; do
    val="$(grep -E "^${var}=" .env 2>/dev/null | head -1 | cut -d'=' -f2-)"
    if [[ -z "$val" ]]; then
      fail "$var is missing or empty in .env"
    else
      pass "$var is set"
    fi
  done

  JWT_VAL="$(grep -E "^JWT_SECRET=" .env 2>/dev/null | head -1 | cut -d'=' -f2-)"
  if [[ ${#JWT_VAL} -lt 32 ]]; then
    fail "JWT_SECRET must be ≥ 32 characters (found ${#JWT_VAL})"
    hint "The server's Zod config validation enforces min(32)."
  fi
else
  fail ".env file not found"
  hint "cp .env.example .env   # then review values"
fi

# ─── 3. Dependencies ──────────────────────────────────────────────────
header "Dependencies"

for pkg_dir in "." "client" "server"; do
  label="${pkg_dir}"
  [[ "$pkg_dir" == "." ]] && label="root"

  if [[ -d "$pkg_dir/node_modules" ]]; then
    pass "$label/node_modules installed"
  else
    fail "$label/node_modules missing"
    hint "Run: npm ci  (in $pkg_dir/)"
  fi
done

if [[ -d "server/node_modules/.prisma/client" ]]; then
  pass "Prisma client generated"
else
  warn "Prisma client not generated"
  hint "Run: cd server && npx prisma generate"
fi

# ─── 4. Docker runtime (skippable) ────────────────────────────────────
header "Docker Runtime"

if $QUICK; then
  skip "Docker runtime checks (--quick mode)"
else
  if docker info &>/dev/null 2>&1; then
    pass "Docker daemon running"

    DEV_SERVICES=("db" "server-dev" "client-dev")
    for svc in "${DEV_SERVICES[@]}"; do
      STATE="$(docker compose ps --format '{{.State}}' "$svc" 2>/dev/null || true)"
      if [[ "$STATE" == "running" ]]; then
        pass "Service '$svc' is running"
      elif [[ -n "$STATE" ]]; then
        warn "Service '$svc' state: $STATE"
        hint "docker compose --profile dev up -d"
      else
        skip "Service '$svc' not started (run: docker compose --profile dev up)"
      fi
    done
  else
    warn "Docker daemon not running — skipping container checks"
    hint "Start Docker Desktop or run: sudo systemctl start docker"
  fi
fi

# ─── 5. Database connectivity (skippable) ─────────────────────────────
header "Database"

if $QUICK; then
  skip "Database checks (--quick mode)"
else
  DB_PORT="$(docker compose ps --format '{{.Ports}}' db 2>/dev/null | grep -oE '0\.0\.0\.0:[0-9]+' | head -1 | cut -d: -f2 || true)"
  if [[ -z "$DB_PORT" ]]; then
    DB_PORT=5432
  fi

  if command -v pg_isready &>/dev/null; then
    if pg_isready -h localhost -p "$DB_PORT" -U postgres &>/dev/null; then
      pass "PostgreSQL reachable on localhost:$DB_PORT"
    else
      warn "PostgreSQL not reachable on localhost:$DB_PORT"
      hint "Ensure the db service is healthy: docker compose --profile dev up -d db"
    fi
  else
    if docker compose exec -T db pg_isready -U postgres &>/dev/null 2>&1; then
      pass "PostgreSQL reachable (via container)"
    else
      warn "Cannot verify PostgreSQL — pg_isready not available locally or in container"
      hint "Install libpq or check: docker compose --profile dev up -d db"
    fi
  fi

  PENDING="$(cd server && npx prisma migrate status 2>&1 || true)"
  if echo "$PENDING" | grep -q "Database schema is up to date"; then
    pass "All Prisma migrations applied"
  elif echo "$PENDING" | grep -qi "pending"; then
    warn "Pending Prisma migrations detected"
    hint "Run: cd server && npx prisma migrate deploy"
  else
    skip "Could not determine migration status"
  fi
fi

# ─── 6. API health ────────────────────────────────────────────────────
header "API Health"

if $QUICK; then
  skip "API health check (--quick mode)"
else
  if command -v curl &>/dev/null; then
    HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:3001/api/health 2>/dev/null)" || true
    if [[ "$HTTP_CODE" == "200" ]]; then
      pass "GET /api/health → 200"
    elif [[ -z "$HTTP_CODE" || "$HTTP_CODE" == "000" ]]; then
      skip "Server not reachable on :3001 (not running?)"
    else
      warn "GET /api/health → $HTTP_CODE"
    fi
  else
    skip "curl not available — cannot check API health"
  fi

  HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:5173 2>/dev/null)" || true
  if [[ "$HTTP_CODE" == "200" ]]; then
    pass "Client dev server reachable on :5173"
  elif [[ -z "$HTTP_CODE" || "$HTTP_CODE" == "000" ]]; then
    skip "Client not reachable on :5173 (not running?)"
  else
    warn "Client on :5173 → HTTP $HTTP_CODE"
  fi
fi

# ─── Summary ──────────────────────────────────────────────────────────
header "Summary"

if [[ $FAILURES -gt 0 ]]; then
  printf "  ${RED}${BOLD}%d failure(s)${RESET}" "$FAILURES"
  [[ $WARNINGS -gt 0 ]] && printf ", ${YELLOW}%d warning(s)${RESET}" "$WARNINGS"
  printf "\n  Fix the failures above before developing.\n\n"
  exit 1
else
  if [[ $WARNINGS -gt 0 ]]; then
    printf "  ${GREEN}${BOLD}All critical checks passed${RESET}, ${YELLOW}%d warning(s)${RESET}\n" "$WARNINGS"
  else
    printf "  ${GREEN}${BOLD}All checks passed — environment looks good!${RESET}\n"
  fi
  printf "\n"
  exit 0
fi
