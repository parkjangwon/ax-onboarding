# ==============================================================================
# Universal AX Onboarding - Windows PowerShell Clean Uninstaller
# Usage: irm https://raw.githubusercontent.com/.../uninstall.ps1 | iex
# Removes ONLY files/directories created by ax-onboarding.
# User-owned custom files under ~/.ax are preserved.
# ==============================================================================

Write-Host "======================================================" -ForegroundColor Red
Write-Host "    🧹 Universal AX Onboarding - Clean Uninstaller     " -ForegroundColor Red
Write-Host "    Restoring Windows environment to pristine state   " -ForegroundColor Red
Write-Host "======================================================" -ForegroundColor Red

$confirm = Read-Host "정말로 AX 온보딩 환경을 완전히 클린 삭제하시겠습니까? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "`n언인스톨이 취소되었습니다." -ForegroundColor Yellow
    exit 0
}

# 1. Restore ~/.claude.json from the LATEST timestamped backup
$claudeJson = Join-Path $HOME ".claude.json"
$backups = Get-ChildItem -Path $HOME -Filter ".claude.json.bak_axonboard.*" -File -ErrorAction SilentlyContinue |
    Sort-Object Name | Select-Object -Last 1

if ($backups) {
    Copy-Item $backups.FullName $claudeJson -Force
    Get-ChildItem -Path $HOME -Filter ".claude.json.bak_axonboard.*" -File -ErrorAction SilentlyContinue |
        Remove-Item -Force
    Write-Host "✓ ~/.claude.json 백업본으로부터 원상복구 완료" -ForegroundColor Green
} else {
    Write-Host "ℹ ~/.claude.json 백업본 없음 (건너뜀)" -ForegroundColor Yellow
}

# 2. Clean Global CLAUDE.md link (remove AX reference lines only)
$globalClaudeMd = Join-Path $HOME ".claude\CLAUDE.md"
if (Test-Path $globalClaudeMd) {
    $content = Get-Content $globalClaudeMd | Where-Object { $_ -notmatch "\.ax[\\/]CLAUDE\.md" -and $_ -notmatch "AX Onboarding Rule Reference" }
    if ($content) {
        Set-Content $globalClaudeMd $content
        Write-Host "✓ ~/.claude\CLAUDE.md 내 AX 전역 링크 안전하게 제거 완료" -ForegroundColor Green
    } else {
        Remove-Item $globalClaudeMd -Force
        Write-Host "✓ 전역 CLAUDE.md (AX 전용) 제거 완료" -ForegroundColor Green
    }
}

# 3. Clean ~/.ax — remove ONLY known ax-onboarding artifacts; preserve user files
$axHome = Join-Path $HOME ".ax"
if (Test-Path $axHome) {
    $artifacts = @(
        (Join-Path $axHome "CLAUDE.md"),
        (Join-Path $axHome "AGENTS.md"),
        (Join-Path $axHome "runbooks"),
        (Join-Path $axHome ".env.mcp"),
        (Join-Path $axHome ".cache")
    )
    foreach ($artifact in $artifacts) {
        if (Test-Path $artifact) {
            Remove-Item $artifact -Recurse -Force
            Write-Host "✓ 제거됨: $artifact" -ForegroundColor Green
        }
    }
    $remaining = Get-ChildItem -Path $axHome -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notlike ".manifest*" }
    if (-not $remaining) {
        Remove-Item $axHome -Recurse -Force
        Write-Host "✓ ~/.ax 디렉터리 제거 완료" -ForegroundColor Green
    } else {
        Write-Host "ℹ ~/.ax 내 사용자 파일이 남아 있어 디렉터리를 유지합니다" -ForegroundColor Yellow
    }
}

# 4. Clean local .ax / .env.mcp / rule file references in current directory
if (Test-Path ".\.ax") {
    Remove-Item ".\.ax" -Recurse -Force
    Write-Host "✓ 로컬 .ax 디렉터리 삭제 완료" -ForegroundColor Green
}

foreach ($ruleFile in @(".\CLAUDE.md", ".\AGENTS.md")) {
    if (Test-Path $ruleFile) {
        $content = Get-Content $ruleFile | Where-Object {
            $_ -notmatch "\.ax[\\/]CLAUDE\.md" -and
            $_ -notmatch "\.ax[\\/]AGENTS\.md" -and
            $_ -notmatch "AX Onboarding"
        }
        if ($content) {
            Set-Content $ruleFile $content
            Write-Host "✓ $ruleFile 내 AX 연결 라인만 제거 (기존 개인 규칙 보존)" -ForegroundColor Green
        } else {
            Remove-Item $ruleFile -Force
            Write-Host "✓ 온보딩 전용 $ruleFile 안전하게 제거 완료" -ForegroundColor Green
        }
    }
}

if (Test-Path ".\.env.mcp") {
    Remove-Item ".\.env.mcp" -Force
    Write-Host "✓ 로컬 .env.mcp 삭제 완료" -ForegroundColor Green
}

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host "    ✨ 클린 삭제가 성공적으로 완료되었습니다!         " -ForegroundColor Green
Write-Host "======================================================`n" -ForegroundColor Green
