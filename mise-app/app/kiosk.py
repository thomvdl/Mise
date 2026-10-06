"""Lance Chrome en plein écran, sans chrome de navigateur (mode kiosque), pointé sur
`mise-public` — l'écran dédié à la brigade en cuisine. Détecte Chrome par chemin connu plutôt que
de compter sur le PATH (voir project.py pour la même contrainte avec docker/git : une app GUI
macOS n'hérite pas du PATH du shell, et Chrome ne s'installe de toute façon jamais dedans).
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Callable, Optional

LogFn = Callable[[str], None]

_PROFILE_DIR = Path.home() / ".mise-kiosk-chrome-profile"


def _disable_password_manager(profile_dir: Path) -> None:
    """Désactive la proposition d'enregistrement de mot de passe — gênante sur un écran partagé
    en cuisine (le mot de passe de connexion à mise-public ne doit pas être proposé à
    l'enregistrement/autofill). Ne touche le fichier qu'au tout premier lancement de ce profil :
    Chrome peut détecter une modification externe de `Preferences` entre deux lancements comme
    une altération et proposer de "restaurer les paramètres" — en écrivant uniquement avant que
    Chrome n'ait jamais démarré sur ce profil, il n'y a rien à détecter comme modifié."""
    default_dir = profile_dir / "Default"
    prefs_path = default_dir / "Preferences"
    if prefs_path.exists():
        return
    default_dir.mkdir(parents=True, exist_ok=True)
    prefs = {
        "profile": {
            "password_manager_enabled": False,
            "credentials_enable_service": False,
            "credentials_enable_autosignin": False,
        }
    }
    prefs_path.write_text(json.dumps(prefs), encoding="utf-8")

_MACOS_CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]

_WINDOWS_CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]


def find_chrome() -> Optional[str]:
    if sys.platform == "darwin":
        candidates = _MACOS_CHROME_PATHS
    elif sys.platform == "win32":
        import os

        local_app_data = os.environ.get("LOCALAPPDATA", "")
        candidates = _WINDOWS_CHROME_PATHS + (
            [str(Path(local_app_data) / "Google" / "Chrome" / "Application" / "chrome.exe")]
            if local_app_data
            else []
        )
    else:
        candidates = []

    for candidate in candidates:
        if Path(candidate).is_file():
            return candidate
    return None


def launch(url: str, log: LogFn) -> None:
    chrome_path = find_chrome()
    if chrome_path is None:
        raise RuntimeError("Google Chrome introuvable (emplacements d'installation habituels vérifiés)")

    _disable_password_manager(_PROFILE_DIR)

    args = [
        chrome_path,
        f"--app={url}",
        "--kiosk",
        "--noerrdialogs",
        "--disable-translate",
        "--no-first-run",
        # Un profil dédié : un Chrome déjà ouvert par ailleurs sur la machine (profil par défaut)
        # ferait sinon échouer `--kiosk` en silence (Chrome réutilise la fenêtre existante, hors
        # mode kiosque).
        f"--user-data-dir={_PROFILE_DIR}",
    ]
    log(f"Lancement de Chrome en mode kiosque sur {url}...")
    # Processus détaché, pas de wait() : la fenêtre Chrome vit sa vie indépendamment de l'app.
    subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
