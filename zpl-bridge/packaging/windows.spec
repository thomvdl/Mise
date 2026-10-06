# Build (sur une machine Windows, depuis la racine de zpl-bridge/) :
#   pyinstaller packaging\windows.spec --distpath dist\windows --workpath build\windows -y
# ou directement `packaging\build_windows.bat`.

from pathlib import Path

PROJECT_ROOT = Path(SPECPATH).parent
APP_NAME = "Pont ZPL - Mise"

a = Analysis(
    [str(PROJECT_ROOT / "run.py")],
    pathex=[str(PROJECT_ROOT)],
    binaries=[],
    datas=[],
    # pywin32 a besoin de ce module au runtime (accès aux fuseaux horaires via COM) mais
    # PyInstaller ne le détecte pas tout seul à l'analyse statique — défaut connu de pywin32.
    hiddenimports=["win32timezone"],
    hookspath=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name=APP_NAME,
    console=False,
)
