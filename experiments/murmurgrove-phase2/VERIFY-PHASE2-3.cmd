@echo off
setlocal
cd /d "%~dp0"
echo Murmurgrove Phase 2.3 - optical refinement verification
echo.
if not exist "public\data\T0.json" (
 echo ERROR: Original Phase 2.2 sandbox snapshots not found. Check the installation folder.
 pause
 exit /b 1
)
node --test tests/phase2-sandbox.test.mjs tests/phase2-navigation.test.mjs tests/phase2-coherence.test.mjs tests/phase2-optical-refinement.test.mjs
if errorlevel 1 (
 echo.
 echo Some tests failed. Do not commit or push.
) else (
 echo.
 echo All tests passed. Perform 1.00x and 10.00x visual acceptance before committing.
)
pause
