@echo off
cd /d "%~dp0"
echo CAUTION: the complete historical regression suite expects a PRISTINE baseline with zero author evidence.
echo For a real private workspace use VERIFY-FINAL.cmd instead.
set /p CONFIRM=Type TEST to continue with pristine fixture tests: 
if /I not "%CONFIRM%"=="TEST" exit /b 2
node --test tests\*.test.mjs
pause
