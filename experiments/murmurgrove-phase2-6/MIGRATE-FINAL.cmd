@echo off
cd /d "%~dp0"
node scripts\migrate-final.mjs
if errorlevel 1 (echo Migration FAILED. Existing evidence was not intentionally replaced.&pause&exit /b 1)
pause
