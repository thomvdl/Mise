"""Démarrage automatique de l'app, par OS — coché/décoché depuis la fenêtre de statut (voir
status_window.py). macOS : agent launchd dans le dossier utilisateur (pas besoin de droits admin).
Windows : raccourci dans le dossier Démarrage de la session (même principe, pas besoin d'une tâche
planifiée qui demanderait des droits admin pour "exécuter sans session ouverte" — voir README.md
pour cette option plus robuste si besoin).
"""

import subprocess
import sys
from pathlib import Path

_MACOS_LABEL = "com.mise.app"


def is_enabled() -> bool:
    if sys.platform == "darwin":
        return _macos_plist_path().exists()
    if sys.platform == "win32":
        return _windows_shortcut_path().exists()
    return False


def enable(executable_path: str) -> None:
    if sys.platform == "darwin":
        _macos_enable(executable_path)
    elif sys.platform == "win32":
        _windows_enable(executable_path)


def disable() -> None:
    if sys.platform == "darwin":
        _macos_disable()
    elif sys.platform == "win32":
        _windows_disable()


# --- macOS ---

def _macos_plist_path() -> Path:
    return Path.home() / "Library" / "LaunchAgents" / f"{_MACOS_LABEL}.plist"


def _macos_enable(executable_path: str) -> None:
    plist = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>{_MACOS_LABEL}</string>
  <key>ProgramArguments</key>
  <array><string>{executable_path}</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
"""
    path = _macos_plist_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(plist, encoding="utf-8")
    subprocess.run(["launchctl", "load", str(path)], check=False)


def _macos_disable() -> None:
    path = _macos_plist_path()
    if path.exists():
        subprocess.run(["launchctl", "unload", str(path)], check=False)
        path.unlink()


# --- Windows ---

def _windows_shortcut_path() -> Path:
    import os

    startup = Path(os.environ["APPDATA"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
    return startup / "MiseApp.lnk"


def _windows_enable(executable_path: str) -> None:
    import win32com.client  # fourni par pywin32, déjà requis pour l'impression RAW

    shortcut_path = _windows_shortcut_path()
    shortcut_path.parent.mkdir(parents=True, exist_ok=True)
    shell = win32com.client.Dispatch("WScript.Shell")
    shortcut = shell.CreateShortCut(str(shortcut_path))
    shortcut.Targetpath = executable_path
    shortcut.WorkingDirectory = str(Path(executable_path).parent)
    shortcut.save()


def _windows_disable() -> None:
    path = _windows_shortcut_path()
    if path.exists():
        path.unlink()
