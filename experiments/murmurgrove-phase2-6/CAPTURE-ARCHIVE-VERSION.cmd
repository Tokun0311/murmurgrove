@echo off
setlocal
cd /d "%~dp0"
echo.
echo Murmurgrove - seal a NEW, author-reviewed SOURCE revision
 echo This never modifies TOW ARCHIVE or the frozen T0 renderer.
echo Requires a newly verified export containing:
echo   known-data-baseline.v1.json
 echo   navigation.json
 echo.
set /p "INPUT_FOLDER=Full path to export folder: "
if "%INPUT_FOLDER%"=="" goto cancel
set /p "CHANGE_NOTE=What actually changed (short note): "
if "%CHANGE_NOTE%"=="" goto cancel
set /p "SOURCE_REF=Source Git commit or verified export ID: "
if "%SOURCE_REF%"=="" goto cancel
echo.
echo Only file-provenance evidence is stored. NO new biological life events.
choice /C YN /N /M "Are you the author/reviewer, and do you approve this source revision? (Y/N): "
if errorlevel 2 goto cancel
node scripts\capture-archive-version.mjs --input "%INPUT_FOLDER%" --note "%CHANGE_NOTE%" --source-ref "%SOURCE_REF%" --author-approved
if errorlevel 1 (
 echo.
 echo CAPTURE FAILED. Existing evidence has not been replaced.
) else (
 echo.
 echo Captured. Please review the new chronicle files in GitHub Desktop.
)
pause
endlocal
exit /b
:cancel
echo Cancelled. No source version was captured.
pause
endlocal
