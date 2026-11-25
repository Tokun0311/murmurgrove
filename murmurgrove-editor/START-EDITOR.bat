@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org/ then retry.
  pause
  exit /b 1
)
echo.
echo   murmurgrove / editor

echo   Starts only on this computer, at http://127.0.0.1:4317

echo   Keep this window open while editing.
echo.
node server.mjs
if errorlevel 1 (
  echo.
  echo Editor could not start. Check the error above.
  pause
)
