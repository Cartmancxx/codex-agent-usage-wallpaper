@echo off
setlocal
chcp 65001 > nul

set "SCRIPT_DIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%tools\run-codex-usage-export.ps1" -Output "%SCRIPT_DIR%agent-status.local.json"
echo Wrote "%SCRIPT_DIR%agent-status.local.json"
pause
