@echo off
cd /d "%~dp0"
node scripts\verify-local.mjs
if errorlevel 1 (echo Local evidence integrity FAILED. Do not publish.&pause&exit /b 1)
pause
