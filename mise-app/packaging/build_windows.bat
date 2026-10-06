@echo off
REM Construit "Mise.exe" dans dist\windows\. Lancez depuis un venv ou requirements-windows.txt
REM est installe (voir README.md).
cd /d "%~dp0\.."
pyinstaller packaging\windows.spec --distpath dist\windows --workpath build\windows -y
echo App construite : dist\windows\Mise.exe
