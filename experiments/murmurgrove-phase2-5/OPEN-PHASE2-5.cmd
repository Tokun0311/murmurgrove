@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22 or newer.
  pause
  exit /b 1
)
start "Murmurgrove Phase 2.5 Local Server" cmd /k "set PORT=4185&& node scripts\serve.mjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4185/?renderer=native"
endlocal
