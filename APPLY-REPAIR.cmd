@echo off
setlocal
cd /d "%~dp0"
node "%~dp0repair-no-git.mjs"
if errorlevel 1 echo Repair stopped. Check the error above.
pause
