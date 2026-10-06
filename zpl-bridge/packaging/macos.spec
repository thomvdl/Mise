# Build : `pyinstaller packaging/macos.spec --distpath dist/macos --workpath build/macos -y`
# (ou directement `./packaging/build_macos.sh`), depuis la racine de zpl-bridge/.
#
# Bundle le `.dylib` libusb trouvé via Homebrew au moment du build dans l'app elle-même — le mini
# PC cible n'a pas forcément Homebrew installé (voir print_backend_macos.py::_bundled_backend).

import subprocess
from pathlib import Path

PROJECT_ROOT = Path(SPECPATH).parent
APP_NAME = "Pont ZPL - Mise"

libusb_path = subprocess.run(
    ["brew", "--prefix", "libusb"], capture_output=True, text=True, check=True
).stdout.strip()
libusb_dylib = str(Path(libusb_path) / "lib" / "libusb-1.0.0.dylib")

a = Analysis(
    [str(PROJECT_ROOT / "run.py")],
    pathex=[str(PROJECT_ROOT)],
    binaries=[(libusb_dylib, ".")],
    datas=[],
    hiddenimports=[],
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
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    name=APP_NAME,
)

app = BUNDLE(
    coll,
    name=f"{APP_NAME}.app",
    bundle_identifier="com.mise.zpl-bridge",
    info_plist={
        # Pas d'icône Dock ni d'entrée Cmd+Tab — c'est une app de barre de menus uniquement.
        "LSUIElement": True,
        "CFBundleShortVersionString": "1.0.0",
        "NSHighResolutionCapable": True,
    },
)
