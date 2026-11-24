@echo off
cd /d "%~dp0"
node scripts\build-public-preview.mjs
if errorlevel 1 (echo Public preview compilation FAILED.&pause&exit /b 1)
echo.
echo A clean static copy is in experiments\murmurgrove-phase2-6\dist-public\
echo It excludes all authored events, withdrawals, screenshots, and derived states.
echo This is not an approval to publish the website.
pause
