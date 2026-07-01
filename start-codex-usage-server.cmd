@echo off
setlocal
chcp 65001 > nul

set "SCRIPT_DIR=%~dp0"

echo Codex usage server
echo URL: http://127.0.0.1:47622/status
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%tools\run-codex-usage-export.ps1" -Serve 47622

echo.
echo Server stopped.
pause
