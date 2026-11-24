@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  pause
  exit /b 1
)
node --test tests\phase2-sandbox.test.mjs tests\phase2-navigation.test.mjs tests\phase2-coherence.test.mjs tests\phase2-optical-refinement.test.mjs tests\phase2-organism-breathing.test.mjs
pause
endlocal
