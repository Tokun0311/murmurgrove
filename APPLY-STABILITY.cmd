@echo off
setlocal
chcp 65001 >nul
set "ROOT=%~1"
if not defined ROOT set "ROOT=%~dp0."
for %%I in ("%ROOT%\.") do set "ROOT=%%~fI"
if not exist "%ROOT%\public\murmurgrove\organism\viewer.mjs" (
  echo Project folder not found. Copy both patch files into the project root.
  pause
  exit /b 1
)
node "%~dp0apply-stability.mjs" "%ROOT%\."
if errorlevel 1 echo Patch stopped. Check the error above.
pause
