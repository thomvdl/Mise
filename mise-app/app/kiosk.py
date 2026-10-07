"""Lance Chromium (ou Google Chrome à défaut) en plein écran, sans chrome de navigateur (mode
kiosque), pointé sur `mise-public` — l'écran dédié à la brigade en cuisine. Détecte le navigateur
par chemin connu plutôt que de compter sur le PATH (voir project.py pour la même contrainte avec
docker/git : une app GUI macOS n'hérite pas du PATH du shell, et ni Chromium ni Chrome ne
s'installent de toute façon dedans).
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Callable, Optional

LogFn = Callable[[str], None]

# Un profil par navigateur : Chromium et Chrome n'ont pas forcément la même version, et un profil
# ouvert par une version plus récente peut être refusé ("profil créé par une version plus
# récente") par l'autre.
_PROFILE_DIRS = {
    "Chromium": Path.home() / ".mise-kiosk-chromium-profile",
    "Google Chrome": Path.home() / ".mise-kiosk-chrome-profile",
}


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

_MACOS_PATHS = {
    "Chromium": ["/Applications/Chromium.app/Contents/MacOS/Chromium"],
    "Google Chrome": ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
}


def _windows_paths() -> dict[str, list[str]]:
    import os

    roots = [
        os.environ.get("PROGRAMFILES", r"C:\Program Files"),
        os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"),
        os.environ.get("LOCALAPPDATA", ""),
    ]
    roots = [root for root in roots if root]
    return {
        # Chromium n'a pas d'installeur officiel sous Windows : les builds courants (winget,
        # Hibbiki, woolyss…) s'installent dans `Chromium\Application`, par utilisateur ou machine.
        "Chromium": [str(Path(root) / "Chromium" / "Application" / "chrome.exe") for root in roots],
        "Google Chrome": [
            str(Path(root) / "Google" / "Chrome" / "Application" / "chrome.exe") for root in roots
        ],
    }


def find_browser() -> Optional[tuple[str, str]]:
    """(nom, chemin) du navigateur à utiliser — Chromium en priorité, Google Chrome sinon."""
    if sys.platform == "darwin":
        paths = _MACOS_PATHS
    elif sys.platform == "win32":
        paths = _windows_paths()
    else:
        paths = {}

    for name in ("Chromium", "Google Chrome"):
        for candidate in paths.get(name, []):
            if Path(candidate).is_file():
                return name, candidate
    return None


def launch(url: str, log: LogFn) -> None:
    browser = find_browser()
    if browser is None:
        raise RuntimeError(
            "Ni Chromium ni Google Chrome introuvable (emplacements d'installation habituels vérifiés)"
        )
    browser_name, browser_path = browser
    profile_dir = _PROFILE_DIRS[browser_name]

    _disable_password_manager(profile_dir)

    args = [
        browser_path,
        f"--app={url}",
        "--kiosk",
        "--noerrdialogs",
        "--disable-translate",
        "--no-first-run",
        # Un profil dédié : un navigateur déjà ouvert par ailleurs sur la machine (profil par
        # défaut) ferait sinon échouer `--kiosk` en silence (il réutilise la fenêtre existante,
        # hors mode kiosque).
        f"--user-data-dir={profile_dir}",
    ]
    log(f"Lancement de {browser_name} en mode kiosque sur {url}...")
    # Processus détaché, pas de wait() : la fenêtre du navigateur vit sa vie indépendamment de
    # l'app.
    subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
