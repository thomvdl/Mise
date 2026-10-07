# Build (sur une machine Windows, depuis la racine de mise-app/) :
#   pyinstaller packaging\windows.spec --distpath dist\windows --workpath build\windows -y
# ou directement `packaging\build_windows.bat`.
#
# Build en mode "dossier" (Mise\Mise.exe + ses DLL à côté) plutôt qu'un .exe unique, et sans UPX :
# un .exe PyInstaller "onefile" se décompresse dans %TEMP% puis exécute du code depuis là, et UPX
# compresse les binaires — deux comportements typiques de malwares qui font régulièrement signaler
# l'app comme virus par Windows Defender (faux positif). Les infos de version (éditeur, produit…)
# vont dans le même sens : un .exe sans métadonnées paraît plus suspect aux heuristiques.

from pathlib import Path

PROJECT_ROOT = Path(SPECPATH).parent
APP_NAME = "Mise"

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
    [],
    exclude_binaries=True,
    name=APP_NAME,
    console=False,
    upx=False,
    icon=str(PROJECT_ROOT / "packaging" / "assets" / "icon.ico"),
    version=str(PROJECT_ROOT / "packaging" / "windows_version_info.txt"),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    upx=False,
    name=APP_NAME,
)
