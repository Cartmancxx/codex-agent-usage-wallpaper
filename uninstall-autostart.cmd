@echo off
setlocal
chcp 65001 > nul

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%uninstall-codex-usage-autostart.ps1"
pause
