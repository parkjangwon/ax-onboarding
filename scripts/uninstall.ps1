# ==============================================================================
# Universal AX Onboarding - Windows PowerShell Clean Uninstaller
# Usage: irm https://raw.githubusercontent.com/.../uninstall.ps1 | iex
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

# 1. Restore ~/.claude.json
$claudeJson = Join-Path $HOME ".claude.json"
$backupJson = Join-Path $HOME ".claude.json.bak_axonboard"

if (Test-Path $backupJson) {
    Copy-Item $backupJson $claudeJson -Force
    Remove-Item $backupJson -Force
    Write-Host "✓ ~/.claude.json 백업본으로부터 원상복구 완료" -ForegroundColor Green
}

# 2. Clean Global CLAUDE.md link
$globalClaudeMd = Join-Path $HOME ".claude\CLAUDE.md"
if (Test-Path $globalClaudeMd) {
    $content = Get-Content $globalClaudeMd | Where-Object { $_ -notmatch "\.ax[\\/]CLAUDE\.md" }
    Set-Content $globalClaudeMd $content
    Write-Host "✓ ~/.claude\CLAUDE.md 내 AX 전역 링크 안전하게 제거 완료" -ForegroundColor Green
}

# 3. Remove ~/.ax directory
$axHome = Join-Path $HOME ".ax"
if (Test-Path $axHome) {
    Remove-Item $axHome -Recurse -Force
    Write-Host "✓ ~/.ax 디렉터리 (런북, 인증정보, 캐시) 완전 삭제 완료" -ForegroundColor Green
}

# 4. Remove local .env.mcp if present
if (Test-Path ".\.env.mcp") {
    Remove-Item ".\.env.mcp" -Force
    Write-Host "✓ 로컬 .env.mcp 삭제 완료" -ForegroundColor Green
}

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host "    ✨ 클린 삭제가 성공적으로 완료되었습니다!         " -ForegroundColor Green
Write-Host "======================================================`n" -ForegroundColor Green
