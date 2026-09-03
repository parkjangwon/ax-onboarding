# ==============================================================================
# Universal AX Onboarding - Windows PowerShell Installer
# Usage: irm https://raw.githubusercontent.com/.../install.ps1 | iex
# ==============================================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "    🚀 Universal AX Onboarding Framework (Windows)    " -ForegroundColor Cyan
Write-Host "    Transforming Daily Work into Agentic Power        " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Check runtime
$runner = ""
if (Get-Command bun -ErrorAction SilentlyContinue) {
    $runner = "bun"
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    $runner = "node"
} else {
    Write-Host "❌ Node.js 또는 Bun 런타임이 감지되지 않았습니다." -ForegroundColor Red
    Write-Host "Node.js (https://nodejs.org) 또는 Bun (https://bun.sh)을 설치해 주세요."
    exit 1
}

Write-Host "✓ 런타임 확인: $runner" -ForegroundColor Green

# 2. Determine installation directory
$axHome = Join-Path $HOME ".ax"
if (!(Test-Path $axHome)) {
    New-Item -ItemType Directory -Path $axHome | Out-Null
}

$cacheDir = Join-Path $axHome ".cache\repo"
$currentDir = Split-Path -Parent $PSScriptRoot

if (Test-Path (Join-Path $currentDir "package.json")) {
    $installDir = $currentDir
    Write-Host "ℹ 로컬 저장소 감지됨: $installDir" -ForegroundColor Blue
} else {
    $installDir = $cacheDir
    if (Test-Path (Join-Path $cacheDir ".git")) {
        Write-Host "ℹ 최신 온보딩 엔진 업데이트 중..." -ForegroundColor Blue
        git -C $cacheDir pull --quiet
    } else {
        Write-Host "ℹ AX 온보딩 엔진 다운로드 중..." -ForegroundColor Blue
        git clone --depth 1 https://github.com/acme/ax-onboarding.git $cacheDir 2>$null
    }
}

# 3. Launch CLI
Write-Host "`n🎯 온보딩 인터뷰 위저드를 실행합니다...`n" -ForegroundColor Yellow

$entryPoint = Join-Path $installDir "src\cli.ts"
if ($runner -eq "bun") {
    bun run $entryPoint $args
} else {
    node $entryPoint $args
}
