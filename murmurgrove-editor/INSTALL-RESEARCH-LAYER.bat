@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js, then retry.
 pause
 exit /b 1
)
echo.
echo murmurgrove / research layer integration
echo This does NOT deploy or push to GitHub. It adds a source index, research reader and a gentle present-only optical overlay.
echo Please Commit or back up your website in GitHub Desktop first.
echo.
node install-site.mjs
if errorlevel 1 (pause & exit /b 1)
echo.
set /p ANSWER=Type INSTALL to apply locally, or press Enter to cancel: 
if /i not "%ANSWER%"=="INSTALL" (
 echo Cancelled; no changes applied.
 pause
 exit /b 0
)
node install-site.mjs --apply
if errorlevel 1 (pause & exit /b 1)
node ..\scripts\sync-murmurgrove-research.mjs
if errorlevel 1 (pause & exit /b 1)
node verify-install.mjs
echo.
echo Next: npm run build; inspect the website; GitHub Desktop Commit / Push only after review.
pause
