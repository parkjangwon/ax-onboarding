# 🚀 Universal AX Onboarding Framework (`ax-onboarding`)

> **"개인의 일상 업무가 AX(선행 DX 포함)되지 않은 상태에서 과업의 결과물에 AI를 결합하려는 시도는 사상누각이다."**  
> 출근부터 퇴근까지의 일상 루틴을 1:1 심층 인터뷰로 진단하고, 에이전트 환경(MCP, 스킬, 작업 규약, 스케줄링)을 원클릭으로 세팅해 주는 **범용 AX(AI Transformation) 온보딩 프레임워크**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Runtime: Bun/Node](https://img.shields.io/badge/Runtime-Bun%20%2F%20Node-black.svg)]()
[![Protocol: MCP](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol-orange.svg)]()
[![Compatible: Claude%20%7C%20Antigravity%20%7C%20Codex](https://img.shields.io/badge/Agents-Claude%20%7C%20Antigravity%20%7C%20Codex-purple.svg)]()

---

## 📌 왜 `ax-onboarding`인가? (Why AX Onboarding?)

많은 기업들이 거창하게 전사 AI 도입을 외치지만 실패하는 이유는 명확합니다:
1. **탑다운(Top-down) AI 쇼잉의 한계**: 실무자 개개인이 매일 손발처럼 쓰는 업무에서 AI와 호흡을 맞춰보지 않았는데, 비즈니스 결과물에 억지로 AI를 붙이려 하니 겉도는 결과물만 양산됩니다.
2. **추상화의 벽**: "AI가 좋다는데, 당장 오늘 내 출근 후 업무에 어떻게 써야 하지?"에 대한 구체적인 답을 찾지 못합니다.
3. **설치 및 보안의 허들**: MCP 서버 설정, 환경 변수, 안전 규정(READONLY 원칙 등)을 설정하다가 기술적 장벽에 부딪혀 포기합니다.

`ax-onboarding`은 **"출근해서 모니터를 켜고 퇴근할 때까지 하는 모든 일"**을 인터뷰하여, AI 에이전트가 대신하거나 가속할 수 있는 영역을 Before/After 청사진으로 도출하고 로컬 머신에 필요한 도구를 **원클릭(Zero-Friction)**으로 프로비저닝합니다.

---

## 🏗️ 시스템 아키텍처 (Architecture)

Core 엔진은 **100% 순수 오픈소스**로 공개되며, 회사나 조직별 보안 수칙/내부 GitLab/사내 MCP 등은 **외부 플러그형 애드온(Addon)**으로 주입됩니다.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Universal AX Onboarding Core Engine                  │
│                                                                        │
│  [1. 출퇴근 루틴 인터뷰] ──► [2. 업무 분해 및 AX 기회 진단] ──► [3. 청사진 생성]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Addon Injection (외부 주입)
                                    ▼
        ┌────────────────────────────────────────────────────────┐
        │             Organization / Enterprise Addon            │
        │   (예: acme-enterprise-addon.json, store-addon.json) │
        │   • 사내 보안 규정 (READONLY DB 원칙, SSH 승인 모드)    │
        │   • 내부 VCS/도구 (사내 GitLab, 사내 플러그인 연동)      │
        │   • 조직 전용 MCP 서버 및 추천 규칙 주입               │
        └───────────────────────────┬────────────────────────────┘
                                    │ Provisioning (환경별 자동 세팅)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Agent Adapter Layer                             │
│                                                                        │
│  • Claude Code   : ~/.claude.json 패치, CLAUDE.md 생성, background job │
│  • Antigravity   : AGENTS.md 작업 규약 계약서 생성, schedule 루틴 연동 │
│  • Claude Desktop: claude_desktop_config.json 자동 주입 (비개발직군)   │
│  • Generic       : 범용 AGENTS.md + CLAUDE.md 통합 생성                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 지원하는 직군 아키타입 (Role Archetypes)

IT 엔지니어뿐만 아니라, 컴퓨터와 데이터를 마주하는 모든 직업을 포괄합니다.

| 직군 카테고리 | 대상 직무 예시 | 주요 에이전틱 전환 영역 (AX Scope) |
|---|---|---|
| **Tech Engineer** | 백엔드, 프론트엔드, DevOps, 인프라 | 서버 로그/스택트레이스 즉각 분석, READONLY DB 연동 트러블슈팅, GitLab 4-Phase 워크플로우, 주간보고 자동화 |
| **Business Office** | 기획, 마케팅, 인사, 회계, 총무 | 엑셀 정산 데이터 대조 및 이상치 검출, 아침 8시 30분 경쟁사 뉴스 브리핑 루틴, 회의록 기반 액션아이템 구조화 |
| **Commerce Merchant** | 온라인 쇼핑몰, 소상공인, 셀러 | 다채널(스마트스토어, 쿠팡) 주문 엑셀 자동 통합, 송장 번호 서식 변환, 고객 리뷰 감성 분석 및 정중한 답변 생성 |
| **Culinary & F&B** | 레스토랑 셰프, 식당/카페 운영자 | 실시간 식자재 시세 반영 메뉴 원가율 계산, 예약 인원 기반 당일 식자재 발주 권고서, 주방 인쇄용 1장 표준 레시피(SOP) |
| **General** | 프리랜서, 1인 기업가, 범용 사무직 | 직무 불문 1:1 문진표 기반 맞춤형 워크플로우 생성 |

---

## 🏢 기업/조직 애드온 (Enterprise Addon System)

특정 기업의 독자적인 보안 수칙, 내부 인트라넷 URL, 전용 GitLab 환경 등을 오픈소스 코어에 하드코딩하지 않고 표준 JSON 스펙으로 주입할 수 있습니다.

```json
{
  "addonId": "acme-enterprise-addon",
  "name": "Acme Enterprise Solution Addon",
  "organization": "Acme (ACME)",
  "version": "1.0.0",
  "groundRules": [
    "보안 최우선 원칙: 외부 DB 접속 시 반드시 READONLY 계정을 별도 생성하여 설정할 것",
    "SSH 원격 명령 실행 시 파괴적 명령어(rm, drop 등)는 사용자 수동 승인 필수",
    "사내 GitLab 4-Phase 파이프라인 준수"
  ],
  "mcpCatalog": [
    {
      "id": "mariadb-readonly",
      "name": "사내 DB READONLY MCP",
      "type": "stdio",
      "command": "uv",
      "args": ["run", "src/server.py"],
      "safetyLevel": "readonly"
    }
  ]
}
```

---

## 🚀 빠른 시작 (Quick Start)

### 방법 1. 대화형 터미널 위저드 실행 (CLI)

```bash
# Bun을 사용하는 경우
bun start

# 또는 Node를 사용하는 경우
npm start
```

터미널에서 안내에 따라:
1. 본인의 직무와 출퇴근 일상 루틴을 답변합니다.
2. 시스템이 업무를 분해하고 **AX 기회 매트릭스(Before vs After)**를 제시합니다.
3. 승인 시 로컬 에이전트 설정 파일(`CLAUDE.md`, `AGENTS.md`, MCP)을 원클릭으로 세팅합니다.
4. 마지막으로 안내되는 **Day-1 Quick Win** 프롬프트를 에이전트에게 입력하여 즉시 성공 경험을 체감합니다.

### 방법 2. 에이전트 스킬로 실행 (`SKILL.md`)

Claude Code, Antigravity, Codex 등의 에이전트 환경에서 직접 스킬로 호출할 수 있습니다.
* 명령어: `/ax-onboard` (또는 `"AX 온보딩 시작해줘"`)
* 에이전트가 1:1 컨설턴트 페르소나로 전환하여 대화형 인터뷰와 자동 프로비저닝을 주도합니다.

---

## 🧪 테스트 실행

```bash
bun test
```
* 직군 아키타입 매칭 검증
* 기업/상인 애드온 스키마 유효성 테스트
* 테스크 분석 및 청사진 생성 검증
* 에이전트 어댑터 로컬 파일 생성(CLAUDE.md / AGENTS.md) 검증

---

## 📄 라이선스 (License)

MIT License © 2026 Park Jang-won (Acme)
