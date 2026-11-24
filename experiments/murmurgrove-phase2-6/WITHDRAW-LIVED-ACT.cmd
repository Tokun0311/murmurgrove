@echo off
cd /d "%~dp0"
echo.
echo WITHDRAW ONE AUTHOR-ATTESTED ACT (private local workspace)
echo This suppresses current activity and hidden history, but DOES NOT delete stored files or Git history.
echo.
set /p EVENTID=Paste exact sealed event ID (evt:...): 
if "%EVENTID%"=="" (echo No ID supplied.&pause&exit /b 2)
set /p CONFIRM=Type WITHDRAW to authorize suppression: 
if /I not "%CONFIRM%"=="WITHDRAW" (echo Cancelled.&pause&exit /b 2)
node scripts\withdraw-lived-act.mjs --event-id "%EVENTID%" --author-approved
pause
