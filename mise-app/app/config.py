"""Petite config persistante (JSON) dans le dossier de données applicatives standard de l'OS —
pour l'instant, seul le nom de l'imprimante Windows configurée en a besoin (macOS se détecte tout
seul par vendor ID USB, voir print_backend_macos.py)."""

import json
import os
import sys
from pathlib import Path


def _config_dir() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", str(Path.home())))
    else:
        base = Path.home() / "Library" / "Application Support"
    path = base / "MiseApp"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _config_file() -> Path:
    return _config_dir() / "config.json"


def load() -> dict:
    path = _config_file()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save(data: dict) -> None:
    _config_file().write_text(json.dumps(data, indent=2), encoding="utf-8")
