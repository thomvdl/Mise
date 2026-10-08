@echo off
REM Construit le dossier "Mise\" (Mise.exe + ses fichiers) dans dist\windows\, une archive
REM Mise-windows.zip, et l'installateur Mise-Setup.exe si Inno Setup 6 est installe. Lancez depuis
REM un venv ou requirements-windows.txt est installe (voir README.md).
cd /d "%~dp0\.."
pyinstaller packaging\windows.spec --distpath dist\windows --workpath build\windows -y || exit /b 1
powershell -NoProfile -Command "Compress-Archive -Path 'dist\windows\Mise' -DestinationPath 'dist\windows\Mise-windows.zip' -Force" || exit /b 1
echo App construite : dist\windows\Mise\Mise.exe
echo Archive a distribuer : dist\windows\Mise-windows.zip

REM ISCC (compilateur Inno Setup) : PATH d'abord, puis emplacements d'installation habituels
REM (par utilisateur via winget, ou pour toute la machine).
set "ISCC="
for %%I in (ISCC.exe) do set "ISCC=%%~$PATH:I"
if not defined ISCC if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
if not defined ISCC if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not defined ISCC if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if not defined ISCC (
    echo Inno Setup 6 introuvable : installateur non construit ^(winget install JRSoftware.InnoSetup^)
    exit /b 0
)
"%ISCC%" /Q packaging\windows_installer.iss || exit /b 1
echo Installateur a distribuer : dist\windows\Mise-Setup.exe
