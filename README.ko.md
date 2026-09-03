# 🚀 범용 AX 온보딩 프레임워크 (`ax-onboarding`)

[English](README.md) | [한국어](README.ko.md)

> **"개인의 일상 업무가 AX(선행 DX 포함)되지 않은 상태에서 과업의 결과물에 AI를 결합하려는 시도는 사상누각이다."**  
> 출근부터 퇴근까지의 일상 루틴을 1:1 대화형 인터뷰로 진단하고, 에이전트의 팔과 다리(MCP), 오픈소스 스킬, 보안 규약, 실전 런북을 사용자 머신 전역에 원클릭으로 세팅해 주는 **엔터프라이즈급 범용 에이전트 하네스 온보딩 프레임워크**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Runtime: Bun / Node](https://img.shields.io/badge/Runtime-Bun%20%2F%20Node-black.svg)]()
[![Protocol: MCP](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol-orange.svg)]()
[![Compatible: Claude | Antigravity | Codex | Cursor](https://img.shields.io/badge/Agents-Claude%20%7C%20Antigravity%20%7C%20Codex%20%7C%20Cursor-purple.svg)]()

---

## 📌 왜 `ax-onboarding`인가?

수많은 기업들이 거창하게 AI 도입을 외치지만 실패하는 이유는 명확합니다:

1. **탑다운(Top-down) AI 쇼잉의 한계**: 실무자 개개인이 매일 손발처럼 쓰는 일상 업무(로그 분석, 이슈 트래킹, 보고서 작성, 데이터 대조)에서 AI와 호흡을 맞춰보지 못했는데, 고객향 제품에만 억지로 AI를 붙이려 하니 사상누각이 됩니다.
2. **추상화의 벽**: "AI가 대세"라는 말만 들었을 뿐, *아침 9시에 모니터를 켜고 퇴근할 때까지 내가 하는 일*에 어떻게 적용해야 하는지 아무도 구체적인 길을 알려주지 않습니다.
3. **설치와 보안의 벽**: 외부 도구를 연결하는 MCP(Model Context Protocol) 설정, 민감한 DB 계정 발급(READONLY 원칙), 안전한 작업 규약(`CLAUDE.md`, `AGENTS.md`)을 직접 작성하는 것은 일반 실무자에게 너무 높은 기술적 장벽입니다.

`ax-onboarding`은 단순한 프롬프트 가이드가 아닙니다. **"살아 숨 쉬는 에이전트 하네스 팩토리(Harness Factory)"**로서, 출퇴근 루틴을 세부 과업으로 분해하고, 글로벌 레지스트리(`skills.sh`, `Smithery.ai`)에서 최적의 도구를 실시간으로 끌어와 사용자 홈 디렉토리에 **원클릭(Zero-Friction)**으로 프로비저닝합니다.

---

## 🏗️ 시스템 아키텍처

코어 엔진은 **100% 순수 오픈소스**이며, 특정 기업/조직의 사내 보안 규정, 내부 GitLab, 사내 플러그인 등은 **외부 플러그형 애드온(Addon)**으로 깔끔하게 주입됩니다.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Universal AX Onboarding Core Engine                  │
│                                                                        │
│  [1. 출퇴근 루틴 인터뷰] ──► [2. 업무 분해 및 AX 기회 진단] ──► [3. 청사진 생성]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Addon Injection (외부 플러그인 주입)
                                    ▼
        ┌────────────────────────────────────────────────────────┐
        │             Organization / Enterprise Addon            │
        │   (예: acme-enterprise-addon.json, store-pack.json)  │
        │   • 사내 보안 규정 (READONLY DB 필수 원칙)              │
        │   • 내부 VCS 및 CI/CD (GitLab 4-Phase 워크플로우)       │
        │   • 사내 전용 MCP 카탈로그 및 추천 도구 세트             │
        └───────────────────────────┬────────────────────────────┘
                                    │ Automated Provisioning (전역 자동 세팅)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   크로스 플랫폼 전역 하네스 계층 (Global Harness)       │
│                                                                        │
│  • Global Scope   : 사용자 홈 디렉토리 (~/.ax 및 %USERPROFILE%\.ax)     │
│  • Claude Code    : ~/.claude.json 패치 및 ~/.claude/CLAUDE.md 전역 링크 │
│  • Antigravity    : ~/.ax/AGENTS.md 전역 작업 규약 계약서 주입          │
│  • Claude Desktop : claude_desktop_config.json 전역 자동 주입 (GUI)   │
│  • 실전 런북      : 5대 실무 런북을 ~/.ax/runbooks/ 에 물리적 생성     │
│  • 멀티 프로젝트  : 어떤 폴더, 어떤 저장소, 어떤 워크트리에서도 즉시 가동│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 지원하는 직군 아키타입 (Role Archetypes)

엔지니어뿐만 아니라, 컴퓨터와 데이터를 마주하는 모든 직업을 포괄합니다:

| 직군 카테고리 | 대상 직무 예시 | 주요 에이전틱 전환 영역 (AX Scope) |
|---|---|---|
| **Tech Engineer** | 백엔드, 프론트엔드, DevOps, 인프라, QA | 장애 로그/스택트레이스 즉시 추적, READONLY DB 무결성 점검, 역호환성 보수적 패치, 사내 GitLab 4-Phase MR 생성 |
| **Business Office** | 기획, 마케팅, 인사, 회계, 총무 | 다중 엑셀 시트 자동 대조 및 이상치 검출, 아침 8시 30분 경쟁사 뉴스 브리핑 루틴, 회의록 기반 액션아이템 구조화 |
| **Commerce Merchant** | 온라인 쇼핑몰, 소상공인, 셀러 | 다채널(스마트스토어, 쿠팡) 주문 엑셀 자동 통합, 택배사 송장 서식 변환, 리뷰 감성 분석 및 정중한 답변 생성 |
| **Culinary & F&B** | 레스토랑 셰프, 식당/카페 운영자 | 실시간 식자재 시세 반영 메뉴 원가율 계산, 예약 인원 기반 당일 식자재 발주 권고서, 주방 인쇄용 1장 표준 레시피(SOP) |
| **General** | 프리랜서, 1인 창업가, 범용 사무직 | 직무 불문 1:1 문진표 기반 맞춤형 워크플로우 생성 |

---

## 🦾 실시간 이원화 디스커버리 (Brain + Limbs)

수만 가지 특수 도메인 도구를 소스코드에 하드코딩하지 않습니다:
- **🧠 두뇌 (Skills)**: `skills.sh` (`npx skills find`)를 쿼리하여 전 세계 커뮤니티에서 검증된 고품질 스킬과 템플릿을 실시간 검색합니다.
- **🦾 사지 (MCP Servers)**: `Smithery.ai` (`@smithery/cli mcp search`)를 쿼리하여 실제 DB, SSH, S3, 브라우저, 슬랙을 조작할 수 있는 외부 도구를 실시간 발굴합니다.

---

## 📚 5대 실전 업무 런북 자동 주입 (`runbooks/`)

온보딩이 완료되면 사용자 홈 디렉토리(`~/.ax/runbooks/`)에 즉시 실행 가능한 마크다운 런북이 물리적으로 생성됩니다:

1. `01-troubleshoot.md`: SSH 로그 추적부터 소스코드 라인 특정, 비파괴 방어 코드 패치 제안까지 이어지는 표준 장애 분석 절차서
2. `02-customer-inquiry.md`: 고객/사내 문의 접수 시 버그 재현 및 3단계 공식 회신 보고서(*현상 - 원인 - 조치방안*) 자동 작성
3. `03-safe-patch.md`: 하위 호환성 및 보수적 패키지 관리 규칙을 준수하며 사내 GitLab 브랜치/MR을 생성하는 런북
4. `04-browser-e2e.md`: Playwright 브라우저를 가동하여 콘솔 에러 및 네트워크 요청 실패를 캡처하는 E2E 테스트 런북
5. `05-security-audit.md`: 배포 전 하드코딩 시크릿, OWASP Top 10, PII(개인정보) 평문 로그 노출 여부를 선제 감사하는 보안 런북

사용자는 어떤 프로젝트에서든 자연스럽게 호출합니다:
> `👉 @~/.ax/runbooks/01-troubleshoot.md 어제 15시 배치 에러 원인 분석해줘`

---

## 🛡️ 엔터프라이즈 보안 및 자격 증명 격리

- **DB READONLY 정책 강제**: 관리자 계정(`root`, `admin`, `sa`) 입력을 시스템 차원에서 원천 차단하고, `GRANT SELECT` 전용 읽기 계정 사용을 강제합니다.
- **자격 증명 유출 제로 (`.env.mcp`)**: 민감한 연결 정보는 Git에 절대 노출되지 않도록 사용자 홈 디렉토리(`~/.ax/.env.mcp`)에 `chmod 600` 권한으로 격리 저장됩니다.
- **파괴적 명령어 가드레일**: `rm -rf`, `drop database`, `reboot` 등 파괴적 명령어는 사용자 수동 승인 없이 에이전트가 단독 실행할 수 없도록 규약에 못 박습니다.

---

## ⚡ 원라인 간편 설치 및 클린 삭제

### 📥 원라인 설치 (One-Line Install)
터미널에서 한 줄만 실행하면 의존성 확인부터 전역 셋업까지 즉시 진행됩니다:

**macOS / Linux**:
```bash
curl -fsSL https://raw.githubusercontent.com/acme/ax-onboarding/master/scripts/install.sh | bash
```

**Windows (PowerShell)**:
```powershell
irm https://raw.githubusercontent.com/acme/ax-onboarding/master/scripts/install.ps1 | iex
```

### 🧹 원라인 클린 삭제 (One-Line Clean Uninstall)
설치 후 마음에 들지 않거나 초기화가 필요할 때, **시스템에 단 1byte의 찌꺼기도 남기지 않고 100% 원상복구**합니다:

**macOS / Linux**:
```bash
curl -fsSL https://raw.githubusercontent.com/acme/ax-onboarding/master/scripts/uninstall.sh | bash
```

**Windows (PowerShell)**:
```powershell
irm https://raw.githubusercontent.com/acme/ax-onboarding/master/scripts/uninstall.ps1 | iex
```

> **🛡️ 클린 삭제 보장 내역:**
> - 백업된 원본 `~/.claude.json`으로 무손실 원상 복원
> - `~/.claude/CLAUDE.md` 내 AX 연결 라인만 선택적 안전 제거 (기존 개인 규칙 100% 보존)
> - 전역 `~/.ax` 디렉터리 (런북, 인증정보, 캐시) 완전 삭제

---

## 🚀 다른 실행 방법

### 방법 1. 로컬 터미널 위저드 직접 실행
```bash
bun start            # 또는 npm start
bun start --rollback # 즉시 롤백 및 원상복구
```

### 방법 2. 에이전트 네이티브 방식 (`SKILL.md` 또는 깃허브 URL)
클로드 데스크톱, 커서, 안티그래비티 대화창에 이 레포지토리 URL을 던져주기만 하면 됩니다:
> *"https://github.com/acme/ax-onboarding 읽고 내 환경에 AX 온보딩 진행해줘."*

에이전트가 `SKILL.md`를 스스로 해석하여 채팅창 내에서 1:1 대화형 인터뷰를 주도합니다.

---

## 🧪 자동화 단위 테스트

```bash
bun test
```
- 직군 아키타입 로딩 및 키워드 라우팅 검증
- 기업 애드온 스키마 유효성 테스트
- 실시간 스킬(`skills.sh`) 및 MCP(`Smithery`) 검색 파서 검증
- DB 관리자 계정 차단 및 0600 자격 증명 격리 검증
- 5대 실전 런북 주입 및 헬스체크 검증
- 안전 롤백 파일 복구 및 정리 검증
- 크로스 플랫폼 경로 해석 검증

*(14개 유닛 테스트 100% 통과)*

---

## 📄 라이선스 (License)

MIT License © 2026 Park Jang-won (Acme)
