@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js 22 or newer.
  pause
  exit /b 1
)
start "Murmurgrove Phase 2.0 Sandbox" cmd /k "node scripts\serve.mjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4178/"
endlocal
