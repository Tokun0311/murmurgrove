@echo off
setlocal
cd /d "%~dp0"
echo MURMURGROVE / Lived Actions / Explicit Author Attestation
echo.
echo This records a research action you have personally confirmed.
echo It is NOT an inferred event or a reconstructed past morphology.
echo The note may be committed to a public repository. Do not include private data.
echo.
set /p DRAFTPATH=Full path to the exported lived-act .json file: 
if not exist "%DRAFTPATH%" (
  echo File not found.
  pause
  exit /b 1
)
echo.
set /p APPROVAL=I personally performed this action and approve recording it [Y/N]: 
if /I not "%APPROVAL%"=="Y" (
  echo Cancelled.
  pause
  exit /b 1
)
node scripts\import-lived-event.mjs --file "%DRAFTPATH%" --author-approved
if errorlevel 1 (
 echo Import failed. Existing ledger was not changed.
) else (
 echo Sealed. Capturing reproducible rule-state checkpoint from verified event evidence...
 node scripts\capture-life-state.mjs
 if errorlevel 1 (echo Event was sealed, but automatic rule-state capture failed. You can run CAPTURE-LIFE-STATE.cmd to retry.) else (echo Both event and rule-state checkpoint are sealed. Reload the viewer ^> History.)
)
pause
endlocal
