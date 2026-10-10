"""Backend Windows pour le capteur de température Zigbee (voir DEPLOY.md §10) : Docker Desktop
sur Windows ne peut pas passer un périphérique USB directement à un conteneur (contrairement à
Linux), mais *peut* le faire une fois ce périphérique attaché à sa distribution WSL2
("docker-desktop") via usbipd-win — https://github.com/dorssel/usbipd-win.

Deux appels seulement, dans cet ordre :
- `usbipd bind` — demande une élévation (UAC), mais une seule fois : le partage ("Shared") est
  persistant, survit aux redémarrages (voir discussion #105 du projet).
- `usbipd attach --wsl --auto-attach` — jamais d'élévation, mais PAS persistant à lui seul : il
  faut relancer cet appel à chaque démarrage de Windows (voir issue #798). `--auto-attach` ne gère
  que les reconnexions à chaud (débranchement/reset) pendant qu'il tourne. C'est pour ça que
  `connect()` est appelée à chaque démarrage de mise-app (voir main.py), pas seulement sur clic —
  l'app étant elle-même lancée au démarrage de Windows, c'est le point d'ancrage naturel.

Le chemin résolu (`/dev/serial/by-id/...`) est écrit dans `.env` (ZIGBEE_SERIAL_DEVICE, lu par
docker-compose.yml — jamais en dur dans ce fichier suivi par git, voir son commentaire) et dans
zigbee2mqtt/configuration.yaml (serial.port, non versionné lui aussi).
"""

import re
import subprocess
import time
from pathlib import Path
from typing import Callable

from .project import CommandError, set_env_var

LogFn = Callable[[str], None]

_WSL_DISTRIBUTION = "docker-desktop"
# Silicon Labs CP210x (dongle Sonoff Zigbee 3.0 Plus), FTDI (ConBee II), CH340 (autres clones) —
# juste pour mettre les candidats plausibles en tête de liste, n'importe quel périphérique listé
# reste sélectionnable (voir list_candidate_devices).
_LIKELY_VENDOR_IDS = {"10c4", "0403", "1a86"}

_CREATION_FLAGS = subprocess.CREATE_NO_WINDOW


def _run(args: list[str], log: LogFn | None = None, timeout: int = 30, cwd: Path | None = None) -> str:
    if log:
        log("$ " + " ".join(args))
    try:
        result = subprocess.run(
            args, cwd=cwd, capture_output=True, text=True, timeout=timeout, creationflags=_CREATION_FLAGS
        )
    except FileNotFoundError as exc:
        raise CommandError(
            f"« {args[0]} » introuvable — installer usbipd-win si ce n'est pas déjà fait "
            "(voir DEPLOY.md §10.A)."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise CommandError(f"« {args[0]} » n'a pas répondu après {timeout}s") from exc
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "échec sans message").strip()
        raise CommandError(detail)
    return result.stdout


# Colonnes séparées par 2 espaces ou plus (voir DEPLOY.md / usbipd list --help) : BUSID, VID:PID,
# DEVICE (qui peut lui-même contenir des virgules/espaces simples), STATE.
_LIST_LINE_RE = re.compile(r"^(\S+)\s+([0-9a-fA-F]{4}:[0-9a-fA-F]{4})\s+(.+?)\s{2,}(\S.*)$")


def list_candidate_devices() -> list[dict]:
    """Périphériques USB connectés vus par usbipd (section "Connected:" uniquement — pas
    "Persisted", qui liste aussi des périphériques débranchés). Triés avec les vendor IDs
    plausibles (_LIKELY_VENDOR_IDS) en tête, mais sans jamais exclure les autres."""
    try:
        output = _run(["usbipd", "list"])
    except CommandError:
        return []

    devices = []
    in_connected = False
    for line in output.splitlines():
        stripped = line.strip()
        if stripped.startswith("Connected"):
            in_connected = True
            continue
        if stripped.startswith("Persisted"):
            in_connected = False
            continue
        if not in_connected or not stripped:
            # Une ligne vide ne doit PAS désactiver in_connected : il y en a une juste après
            # "Connected:" elle-même, avant la ligne d'en-tête BUSID/VID:PID/DEVICE/STATE.
            continue
        match = _LIST_LINE_RE.match(line)
        if not match or match.group(1).upper() == "BUSID":
            continue
        busid, vidpid, device, state = match.groups()
        devices.append({
            "busid": busid,
            "vidpid": vidpid,
            "device": device.strip(),
            "state": state.strip(),
            "likely": vidpid.split(":")[0].lower() in _LIKELY_VENDOR_IDS,
        })
    devices.sort(key=lambda d: not d["likely"])
    return devices


def connect(busid: str, repo_path: Path, log: LogFn) -> None:
    """Partage puis attache le dongle désigné par `busid` (voir list_candidate_devices), résout
    son chemin stable sous WSL et le propage dans .env + zigbee2mqtt/configuration.yaml."""
    devices = list_candidate_devices()
    state = next((d["state"] for d in devices if d["busid"] == busid), "")
    if not state:
        raise CommandError(f"Périphérique {busid} introuvable (débranché depuis ?).")

    if "Shared" not in state and "Attached" not in state:
        log(f"Partage du périphérique {busid} — une fenêtre d'autorisation Windows va s'ouvrir...")
        _run(["usbipd", "bind", "--busid", busid], log=log)

    if "Attached" not in state:
        log(f"Attache de {busid} à la distribution WSL « {_WSL_DISTRIBUTION} »...")
        # Popen, pas _run : --auto-attach tourne en continu (pour réattacher après un
        # débranchement/reset) et ne se termine jamais tant qu'on en a besoin.
        subprocess.Popen(
            ["usbipd", "attach", "--wsl", "--distribution", _WSL_DISTRIBUTION,
             "--busid", busid, "--auto-attach"],
            creationflags=_CREATION_FLAGS,
        )
        time.sleep(3)

    log("Résolution du chemin du périphérique dans WSL...")
    listing = _run(["wsl", "-d", _WSL_DISTRIBUTION, "--", "ls", "-1", "/dev/serial/by-id/"])
    names = [n.strip() for n in listing.splitlines() if n.strip()]
    if not names:
        raise CommandError(
            "Aucun périphérique dans /dev/serial/by-id/ sous WSL — l'attache a peut-être échoué, "
            "ou ce dongle n'expose pas de port série standard."
        )
    device_path = f"/dev/serial/by-id/{names[0]}"
    log(f"Périphérique résolu : {device_path}")

    _propagate_device_path(repo_path, device_path, log)


def ensure_attached(busid: str, log: LogFn) -> None:
    """Relance seulement l'attache (pas le bind, déjà fait et persistant) — appelée à chaque
    démarrage de mise-app, voir docstring du module. Silencieuse si déjà attaché ou si aucun
    busid n'a encore été configuré (reconnaît aussi ce dernier cas comme un no-op, pas une erreur :
    tant que personne n'a cliqué "Connecter" une première fois, il n'y a rien à faire)."""
    if not busid:
        return
    state = next((d["state"] for d in list_candidate_devices() if d["busid"] == busid), "")
    if "Attached" in state:
        return
    subprocess.Popen(
        ["usbipd", "attach", "--wsl", "--distribution", _WSL_DISTRIBUTION,
         "--busid", busid, "--auto-attach"],
        creationflags=_CREATION_FLAGS,
    )
    log(f"Capteur Zigbee ({busid}) réattaché à WSL après le démarrage de l'app.")


def _propagate_device_path(repo_path: Path, device_path: str, log: LogFn) -> None:
    zigbee_dir = repo_path / "zigbee2mqtt"
    config_file = zigbee_dir / "configuration.yaml"
    if not config_file.exists():
        example = zigbee_dir / "configuration.yaml.example"
        config_file.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")

    content = config_file.read_text(encoding="utf-8")
    # Ancré sur le bloc "serial:" (pas juste la clé "port:" seule) : "frontend:" a aussi sa propre
    # clé "port" plus bas dans le même fichier. ".*?" + DOTALL pour traverser les lignes de
    # commentaire entre "serial:" et sa clé "port:" (voir configuration.yaml.example).
    content, count = re.subn(
        r"(serial:.*?\n\s*port:\s*)\S*", rf"\1{device_path}", content, count=1, flags=re.DOTALL
    )
    if count == 0:
        raise CommandError(f"Bloc « serial: / port: » introuvable dans {config_file}.")
    config_file.write_text(content, encoding="utf-8")
    log(f"{config_file} mis à jour (serial.port).")

    env_path = repo_path / ".env"
    env_content = env_path.read_text(encoding="utf-8")
    env_path.write_text(set_env_var(env_content, "ZIGBEE_SERIAL_DEVICE", device_path), encoding="utf-8")
    log(".env mis à jour (ZIGBEE_SERIAL_DEVICE).")

    log("Redémarrage du conteneur zigbee2mqtt...")
    _run(["docker", "compose", "up", "-d", "zigbee2mqtt"], log=log, timeout=120, cwd=repo_path)
    log("Capteur Zigbee connecté.")
