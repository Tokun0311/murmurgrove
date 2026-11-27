@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. No archive data changed.
  pause
  exit /b 1
)
echo Close the Editor before running this migration.
echo.
node scripts/migrate-profile-metadata.mjs
if errorlevel 1 goto failed
echo.
choice /C YN /M "Apply these explicit metadata additions to your current archive (private backups will be saved)"
if errorlevel 2 goto finish
node scripts/migrate-profile-metadata.mjs --apply
if errorlevel 1 goto failed
echo.
echo Migration finished. Testing local build; nothing will be pushed.
call npm run build
if errorlevel 1 goto failed
echo.
echo Build passed. You can reopen the Editor and review Git changes before pushing.
goto finish
:failed
echo.
echo A command failed. Do not push until you review the message above.
:finish
pause
