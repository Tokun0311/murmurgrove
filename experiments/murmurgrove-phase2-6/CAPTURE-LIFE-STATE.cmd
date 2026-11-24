@echo off
setlocal
cd /d "%~dp0"
echo MURMURGROVE / Capture existing author-evidenced rule state
node scripts\capture-life-state.mjs
if errorlevel 1 (echo Verification failed. Check the ledger and source files.) else (echo Verified. Reload the viewer ^> History ^> Life states.)
pause
endlocal
