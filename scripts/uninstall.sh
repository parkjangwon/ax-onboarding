#!/usr/bin/env bash
set -e

# ==============================================================================
# Universal AX Onboarding - One-Line Clean Uninstaller (macOS & Linux)
# Usage: curl -fsSL https://raw.githubusercontent.com/.../uninstall.sh | bash
# ==============================================================================

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}${RED}"
echo "======================================================"
echo "    🧹 Universal AX Onboarding - Clean Uninstaller     "
echo "    Restoring your system to pristine pre-setup state "
echo "======================================================"
echo -e "${NC}"

# Ask for confirmation
exec < /dev/tty
read -p "정말로 AX 온보딩 환경을 완전히 클린 삭제하시겠습니까? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo -e "\n${YELLOW}언인스톨이 취소되었습니다.${NC}"
  exit 0
fi

echo -e "\n${BLUE}1. 백업된 Claude 설정 복원 중...${NC}"
CLAUDE_JSON="$HOME/.claude.json"
BACKUP_CLAUDE_JSON="$HOME/.claude.json.bak_axonboard"

if [ -f "$BACKUP_CLAUDE_JSON" ]; then
  cp "$BACKUP_CLAUDE_JSON" "$CLAUDE_JSON"
  rm -f "$BACKUP_CLAUDE_JSON"
  echo -e "${GREEN}✓ ~/.claude.json 백업본으로부터 원상복구 완료${NC}"
else
  echo -e "${YELLOW}ℹ ~/.claude.json 백업본 없음 (건너뜀)${NC}"
fi

echo -e "\n${BLUE}2. 글로벌 전역 CLAUDE.md 연결 제거 중...${NC}"
GLOBAL_CLAUDE_MD="$HOME/.claude/CLAUDE.md"
if [ -f "$GLOBAL_CLAUDE_MD" ]; then
  # Remove lines referencing .ax/CLAUDE.md
  grep -v "\.ax/CLAUDE\.md" "$GLOBAL_CLAUDE_MD" > "${GLOBAL_CLAUDE_MD}.tmp" || true
  mv "${GLOBAL_CLAUDE_MD}.tmp" "$GLOBAL_CLAUDE_MD"
  echo -e "${GREEN}✓ ~/.claude/CLAUDE.md 내 AX 전역 링크 안전하게 제거 완료${NC}"
fi

echo -e "\n${BLUE}3. 글로벌 AX 저장소 (~/.ax) 완전 삭제 중...${NC}"
AX_HOME="$HOME/.ax"
if [ -d "$AX_HOME" ]; then
  rm -rf "$AX_HOME"
  echo -e "${GREEN}✓ ~/.ax 디렉터리 (런북, 인증정보, 캐시) 완전 삭제 완료${NC}"
fi

# Clean current working directory if local files exist
if [ -d "./.ax" ]; then
  rm -rf "./.ax"
  echo -e "${GREEN}✓ 로컬 .ax 디렉터리 삭제 완료${NC}"
fi

for RULE_FILE in "./CLAUDE.md" "./AGENTS.md"; do
  if [ -f "$RULE_FILE" ]; then
    grep -v "\.ax/CLAUDE\.md" "$RULE_FILE" | grep -v "\.ax/AGENTS\.md" | grep -v "AX Onboarding" > "${RULE_FILE}.tmp" || true
    if [ ! -s "${RULE_FILE}.tmp" ] || [ "$(tr -d '[:space:]' < "${RULE_FILE}.tmp")" = "" ]; then
      rm -f "$RULE_FILE" "${RULE_FILE}.tmp"
      echo -e "${GREEN}✓ 온보딩 전용 $RULE_FILE 안전하게 제거 완료${NC}"
    else
      mv "${RULE_FILE}.tmp" "$RULE_FILE"
      echo -e "${GREEN}✓ $RULE_FILE 내 AX 연결 라인만 제거 (기존 개인 규칙 보존)${NC}"
    fi
  fi
done

if [ -f "./.env.mcp" ]; then
  rm -f "./.env.mcp"
  echo -e "${GREEN}✓ 로컬 .env.mcp 삭제 완료${NC}"
fi

echo -e "\n${BOLD}${GREEN}======================================================"
echo "    ✨ 클린 삭제가 성공적으로 완료되었습니다!         "
echo "    언제든 다시 셋업하려면 아래 명령어를 실행하세요:  "
echo "    curl -fsSL https://.../install.sh | bash          "
echo "======================================================${NC}\n"
