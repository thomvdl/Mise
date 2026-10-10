"""Backend macOS pour le capteur de température Zigbee (voir DEPLOY.md §10) : contrairement à
Windows (usbipd-win + WSL2, voir zigbee_windows.py), Docker Desktop sur macOS n'a aucun mécanisme
de passthrough USB vers un conteneur, même indirect — confirmé en l'absence de tout équivalent
d'usbipd-win pour macOS. Zigbee2MQTT tourne donc nativement sur la machine (hors Docker), comme le
fait déjà le pont ZPL pour l'imprimante USB (voir print_backend_macos.py), et se connecte au
broker `mosquitto` dockerisé via son port publié (localhost:1883) comme n'importe quel client MQTT
externe.

Installé dans le dossier de données de l'app (pas dans le clone du projet Mise : c'est un projet
tiers volumineux, pas du code du projet) — voir config._config_dir().
"""

import shutil
import subprocess
import time
from pathlib import Path
from typing import Callable, Optional

from .project import CommandError

LogFn = Callable[[str], None]

_REPO_URL = "https://github.com/Koenkk/zigbee2mqtt.git"
_MQTT_SERVER = "mqtt://localhost:1883"
_FRONTEND_PORT = 8084

# Suffixes de pilote USB-série habituels sur macOS pour les coordinateurs Zigbee usuels : CP210x
# (dongle Sonoff Zigbee 3.0 Plus), CH340 (clones), FTDI (ConBee II). N'importe quel /dev/cu.*
# reste sélectionnable, ceux-ci sont juste proposés en premier (voir list_candidate_devices).
_LIKELY_PATTERNS = ("usbserial", "slab_usbtouart", "wchusbserial")
# Toujours présent sur macOS, jamais un coordinateur Zigbee — exclu plutôt que simplement
# déprioriser, pour ne pas polluer une liste qui tient déjà sur peu d'entrées.
_ALWAYS_EXCLUDE = ("bluetooth",)


def _install_dir() -> Path:
    from . import config

    return config.app_data_dir() / "zigbee2mqtt"


def _run(args: list[str], cwd: Path | None = None, log: LogFn | None = None, timeout: int = 1800) -> str:
    if log:
        log("$ " + " ".join(args))
    try:
        result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError as exc:
        raise CommandError(f"« {args[0]} » introuvable — pas installé, ou pas dans le PATH ?") from exc
    except subprocess.TimeoutExpired as exc:
        raise CommandError(f"« {args[0]} » n'a pas répondu après {timeout}s") from exc
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "échec sans message").strip()
        raise CommandError(detail[-2000:])
    return result.stdout


def is_node_available() -> bool:
    return shutil.which("node") is not None and shutil.which("npm") is not None


def is_installed() -> bool:
    return (_install_dir() / "package.json").is_file()


def list_candidate_devices() -> list[dict]:
    paths = sorted(Path("/dev").glob("cu.*"))
    devices = []
    for path in paths:
        name = path.name.lower()
        if any(excluded in name for excluded in _ALWAYS_EXCLUDE):
            continue
        devices.append({
            "path": str(path),
            "device": path.name,
            "likely": any(pattern in name for pattern in _LIKELY_PATTERNS),
        })
    devices.sort(key=lambda d: not d["likely"])
    return devices


def install(log: LogFn) -> None:
    install_dir = _install_dir()
    if install_dir.is_dir():
        log(f"{install_dir} existe déjà — pas re-cloné.")
    else:
        log(f"Clonage de Zigbee2MQTT dans {install_dir}...")
        _run(["git", "clone", "--depth", "1", _REPO_URL, str(install_dir)], log=log)

    log("Installation des dépendances (npm ci)...")
    _run(["npm", "ci"], cwd=install_dir, log=log)
    log("Compilation (npm run build)...")
    _run(["npm", "run", "build"], cwd=install_dir, log=log)
    log("Zigbee2MQTT installé.")


def _write_configuration(device_path: str, log: LogFn) -> None:
    data_dir = _install_dir() / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    config_file = data_dir / "configuration.yaml"
    config_file.write_text(
        "mqtt:\n"
        f"  server: '{_MQTT_SERVER}'\n"
        "serial:\n"
        f"  port: {device_path}\n"
        "frontend:\n"
        f"  port: {_FRONTEND_PORT}\n"
        "homeassistant:\n"
        "  enabled: false\n",
        encoding="utf-8",
    )
    log(f"{config_file} écrit (serial.port = {device_path}).")


_process: Optional[subprocess.Popen] = None


def is_running() -> bool:
    return _process is not None and _process.poll() is None


def connect(device_path: str, log: LogFn) -> None:
    """Écrit la config puis (re)démarre Zigbee2MQTT nativement — appelée depuis le bouton
    "Connecter" (après install()) et à chaque démarrage de mise-app si déjà configuré, voir
    ensure_running()."""
    if not is_installed():
        raise CommandError("Zigbee2MQTT n'est pas encore installé — cliquer d'abord « Installer ».")

    # stop() d'abord : si Zigbee2MQTT tournait déjà avec un autre capteur choisi précédemment,
    # start() ci-dessous no-op sinon ("tourne déjà") sans jamais relire la nouvelle config écrite
    # à la ligne suivante.
    stop(log)
    _write_configuration(device_path, log)
    start(log)


def start(log: LogFn) -> None:
    global _process
    if is_running():
        log("Zigbee2MQTT tourne déjà.")
        return

    log("Démarrage de Zigbee2MQTT...")
    log_file = _install_dir() / "data" / "mise-app.log"
    # Sortie redirigée vers un fichier plutôt que journalisée ligne à ligne dans l'app : Zigbee2MQTT
    # est bavard (un message par relevé de chaque capteur), ça noierait "Activité récente" en
    # quelques minutes. Le fichier reste consultable à la main en cas de souci (voir DEPLOY.md §10).
    handle = open(log_file, "a", encoding="utf-8")
    _process = subprocess.Popen(
        ["npm", "start"], cwd=_install_dir(), stdout=handle, stderr=subprocess.STDOUT
    )
    time.sleep(1)
    if _process.poll() is not None:
        raise CommandError(f"Zigbee2MQTT s'est arrêté immédiatement — voir {log_file}.")
    log(f"Zigbee2MQTT démarré (interface d'appairage : http://localhost:{_FRONTEND_PORT}).")


def stop(log: LogFn | None = None) -> None:
    global _process
    if not is_running():
        return
    _process.terminate()
    try:
        _process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        _process.kill()
    _process = None
    if log:
        log("Zigbee2MQTT arrêté.")


def ensure_running(device_path: str | None, log: LogFn) -> None:
    """Appelée au démarrage de mise-app (voir main.py) — redémarre Zigbee2MQTT tout seul si déjà
    configuré, comme ensure_project_running le fait pour la pile Docker. No-op tant que personne
    n'a cliqué « Connecter » une première fois (device_path vide)."""
    if not device_path or not is_installed() or is_running():
        return
    try:
        start(log)
    except CommandError as exc:
        log(f"Échec du redémarrage automatique de Zigbee2MQTT : {exc}", level="error")
