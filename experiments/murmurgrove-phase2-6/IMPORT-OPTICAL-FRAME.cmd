@echo off
setlocal
cd /d "%~dp0"
echo MURMURGROVE / Present Optical Frame / Manual import
 echo.
echo This stores a browser-exported screenshot plus its verifiable renderer evidence.
echo It is NOT a physiological life event or reconstructed historical body.
echo.
set /p FRAMEPATH=Full path to the exported .json file: 
if not exist "%FRAMEPATH%" (
  echo File not found.
  pause
  exit /b 1
)
echo.
set /p APPROVAL=I personally reviewed this present capture and approve sealing it [Y/N]: 
if /I not "%APPROVAL%"=="Y" (
  echo Cancelled.
  pause
  exit /b 1
)
node scripts\import-optical-frame.mjs --file "%FRAMEPATH%" --author-approved
if errorlevel 1 (echo Import failed. Original files were not replaced.) else (echo Import complete. Restart OPEN-THREADS.cmd and open History ^> Optical frames.)
pause
endlocal
