@echo off
cd /d "%~dp0"
node scripts\build-public-preview.mjs
if errorlevel 1 (echo Public preview compiler failed.&pause&exit /b 1)
set PORT=4190
start "" "http://127.0.0.1:4190/"
node scripts\serve.mjs --public-preview
pause
