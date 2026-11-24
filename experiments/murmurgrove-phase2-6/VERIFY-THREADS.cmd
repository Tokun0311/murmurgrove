@echo off
cd /d "%~dp0"
echo Checking CURRENT local source and evidence integrity (works with private records).
node scripts\verify-local.mjs
if errorlevel 1 (echo Local verification FAILED. Do not publish.&pause&exit /b 1)
pause
