@echo off
REM Construit le dossier "Mise\" (Mise.exe + ses fichiers) dans dist\windows\, plus une archive
REM Mise-windows.zip a copier sur le mini PC. Lancez depuis un venv ou requirements-windows.txt
REM est installe (voir README.md).
cd /d "%~dp0\.."
pyinstaller packaging\windows.spec --distpath dist\windows --workpath build\windows -y || exit /b 1
powershell -NoProfile -Command "Compress-Archive -Path 'dist\windows\Mise' -DestinationPath 'dist\windows\Mise-windows.zip' -Force" || exit /b 1
echo App construite : dist\windows\Mise\Mise.exe
echo Archive a distribuer : dist\windows\Mise-windows.zip
