#!/usr/bin/env bash
set -e

# ==============================================================================
# Universal AX Onboarding - One-Line Installer (macOS & Linux)
# Usage: curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash
# ==============================================================================

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}"
echo "======================================================"
echo "    🚀 Universal AX Onboarding Framework Installer    "
echo "    Transforming Daily Work into Agentic Power        "
echo "======================================================"
echo -e "${NC}"

# 1. Check runtime (Bun or Node.js)
RUNNER=""
if command -v bun >/dev/null 2>&1; then
  RUNNER="bun"
elif command -v node >/dev/null 2>&1; then
  RUNNER="node"
else
  echo -e "${RED}❌ Node.js 또는 Bun 런타임이 감지되지 않았습니다.${NC}"
  echo "Node.js (>= 18) 또는 Bun을 먼저 설치해 주세요."
  echo "Bun 간편 설치: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

echo -e "${GREEN}✓ 런타임 확인: $RUNNER ($(command -v $RUNNER))${NC}"

# 2. Determine installation source / directory
AX_CACHE_DIR="$HOME/.ax/.cache/repo"
mkdir -p "$HOME/.ax/.cache"

# If running inside local ax-onboarding repository:
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd || echo "")"
if [ -f "$CURRENT_DIR/package.json" ] && grep -q '"name": "ax-onboarding"' "$CURRENT_DIR/package.json" 2>/dev/null; then
  INSTALL_DIR="$CURRENT_DIR"
  echo -e "${BLUE}ℹ 로컬 레포지토리 감지됨: $INSTALL_DIR${NC}"
else
  # Remote/CURL mode: Clone or update in cache
  INSTALL_DIR="$AX_CACHE_DIR"
  if [ -d "$AX_CACHE_DIR/.git" ]; then
    echo -e "${BLUE}ℹ 최신 온보딩 엔진 업데이트 중...${NC}"
    git -C "$AX_CACHE_DIR" pull --quiet 2>/dev/null || true
  else
    echo -e "${BLUE}ℹ AX 온보딩 엔진 다운로드 중...${NC}"
    git clone --depth 1 https://github.com/parkjangwon/ax-onboarding.git "$AX_CACHE_DIR" 2>/dev/null || {
      # Fallback if private repo or offline: check if local copy exists
      echo -e "${YELLOW}원격 저장소 다운로드 건너뜀 (로컬 런타임 구동)${NC}"
    }
  fi
fi

# 3. Launch interactive CLI onboarding wizard
echo -e "\n${BOLD}🎯 온보딩 인터뷰 위저드를 실행합니다...${NC}\n"

if [ "$RUNNER" = "bun" ]; then
  exec < /dev/tty
  bun run "$INSTALL_DIR/src/cli.ts" "$@"
else
  exec < /dev/tty
  node --loader ts-node/esm "$INSTALL_DIR/src/cli.ts" "$@" 2>/dev/null || node "$INSTALL_DIR/bin/ax-onboard.mjs" "$@"
fi
