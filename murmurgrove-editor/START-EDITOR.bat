@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org/ then retry.
  pause
  exit /b 1
)
node "_upgrade-v12\prepare.mjs"
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo   murmurgrove / editor v1.2
echo   http://127.0.0.1:4317
echo   Keep this window open while editing.
echo.
node server.mjs
if errorlevel 1 pause
