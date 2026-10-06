@echo off
REM Construit "Pont ZPL - Mise.exe" dans dist\windows\. Lancez depuis un venv ou
REM requirements-windows.txt est installe (voir README.md).
cd /d "%~dp0\.."
pyinstaller packaging\windows.spec --distpath dist\windows --workpath build\windows -y
echo App construite : dist\windows\Pont ZPL - Mise.exe
