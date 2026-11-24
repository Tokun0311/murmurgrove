@echo off
setlocal
cd /d "%~dp0"
echo MURMURGROVE / Privacy + Evidence / Read-only publication check
echo.
node scripts\prepublish-audit.mjs
if errorlevel 1 (echo Publication must be reviewed by the archive author.) else (echo Source evidence and publication gate passed.)
pause
endlocal
