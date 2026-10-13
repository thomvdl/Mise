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
import shutil
import subprocess
import time
from pathlib import Path
from typing import Callable

from .project import CommandError, set_env_var

LogFn = Callable[[str], None]

_WSL_DISTRIBUTION = "docker-desktop"
# Silicon Labs CP210x (dongle Sonoff Zigbee 3.0 Plus), Dresden Elektronik (ConBee II/III), FTDI
# (ConBee I), CH340 (autres clones) — juste pour mettre les candidats plausibles en tête de liste,
# n'importe quel périphérique listé reste sélectionnable (voir list_candidate_devices).
_LIKELY_VENDOR_IDS = {"10c4", "1cf1", "0403", "1a86"}

_CREATION_FLAGS = subprocess.CREATE_NO_WINDOW

_USBIPD_DEFAULT_PATH = Path(r"C:\Program Files\usbipd-win\usbipd.exe")
USBIPD_INSTALL_COMMAND = "winget install dorssel.usbipd-win"


class UsbipdMissingError(CommandError):
    """usbipd-win absent — porte la commande d'installation, que la fenêtre de statut propose de
    copier (le texte d'"Activité récente" n'est pas sélectionnable)."""

    install_command = USBIPD_INSTALL_COMMAND

    def __init__(self) -> None:
        super().__init__(
            "usbipd-win n'est pas installé — dans un terminal (confirmation administrateur "
            f"demandée) : {USBIPD_INSTALL_COMMAND}"
        )


def _usbipd() -> str:
    # Emplacement d'installation par défaut en repli : une app lancée avant l'installation
    # d'usbipd-win (ou depuis un process parent au PATH figé) ne le trouverait pas dans son PATH.
    return shutil.which("usbipd") or (str(_USBIPD_DEFAULT_PATH) if _USBIPD_DEFAULT_PATH.exists() else "usbipd")


def _run(args: list[str], log: LogFn | None = None, timeout: int = 30, cwd: Path | None = None) -> str:
    if log:
        log("$ " + " ".join(args))
    try:
        result = subprocess.run(
            args, cwd=cwd, capture_output=True, text=True, timeout=timeout, creationflags=_CREATION_FLAGS
        )
    except FileNotFoundError as exc:
        if Path(args[0]).stem.lower() == "usbipd":
            raise UsbipdMissingError() from exc
        raise CommandError(f"« {args[0]} » introuvable.") from exc
    except subprocess.TimeoutExpired as exc:
        raise CommandError(f"« {args[0]} » n'a pas répondu après {timeout}s") from exc
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "échec sans message").strip()
        raise CommandError(detail)
    return result.stdout


def _run_elevated(args: list[str], log: LogFn) -> None:
    """Comme _run, mais via l'invite UAC : usbipd ne s'élève pas tout seul, il échoue juste avec
    "Access denied" s'il n'est pas lancé en administrateur. Start-Process -Verb RunAs ouvre la
    fenêtre d'autorisation ; un refus fait échouer Start-Process, donc un code retour non nul."""
    log("$ " + " ".join(args) + " (en administrateur)")
    arg_list = ",".join(f"'{a}'" for a in args[1:])
    _run(
        ["powershell", "-NoProfile", "-Command",
         f"$p = Start-Process -FilePath '{args[0]}' -ArgumentList {arg_list} -Verb RunAs -Wait "
         "-PassThru -WindowStyle Hidden; exit $p.ExitCode"],
        timeout=120,
    )


# Colonnes séparées par 2 espaces ou plus (voir DEPLOY.md / usbipd list --help) : BUSID, VID:PID,
# DEVICE (qui peut lui-même contenir des virgules/espaces simples), STATE.
_LIST_LINE_RE = re.compile(r"^(\S+)\s+([0-9a-fA-F]{4}:[0-9a-fA-F]{4})\s+(.+?)\s{2,}(\S.*)$")


def list_candidate_devices() -> list[dict]:
    """Périphériques USB connectés vus par usbipd (section "Connected:" uniquement — pas
    "Persisted", qui liste aussi des périphériques débranchés). Triés avec les vendor IDs
    plausibles (_LIKELY_VENDOR_IDS) en tête, mais sans jamais exclure les autres. Lève
    CommandError si usbipd est absent ou en échec, plutôt qu'une liste vide muette."""
    output = _run([_usbipd(), "list"])

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
    device = next((d for d in list_candidate_devices() if d["busid"] == busid), None)
    if not device:
        raise CommandError(f"Périphérique {busid} introuvable (débranché depuis ?).")
    state = device["state"]

    if "Shared" not in state and "Attached" not in state:
        log(f"Partage du périphérique {busid} — une fenêtre d'autorisation Windows va s'ouvrir...")
        _run_elevated([_usbipd(), "bind", "--busid", busid], log=log)

    if "Attached" not in state:
        log(f"Attache de {busid} à la distribution WSL « {_WSL_DISTRIBUTION} »...")
        _start_auto_attach(busid)
        time.sleep(3)
    _load_serial_drivers(log)

    log("Résolution du chemin du périphérique dans WSL...")
    # /dev/serial/by-id/ d'abord (chemin stable, s'il existe), sinon le nœud brut : la distribution
    # docker-desktop n'a pas d'udev, donc pas de liens by-id — juste /dev/ttyACM0 ou /dev/ttyUSB0.
    listing = _run(["wsl", "-d", _WSL_DISTRIBUTION, "--", "sh", "-c",
                    "ls -1 /dev/serial/by-id/* /dev/ttyACM* /dev/ttyUSB* 2>/dev/null; true"])
    paths = [p.strip() for p in listing.splitlines() if p.strip()]
    if not paths:
        raise CommandError(
            "Aucun port série (/dev/ttyACM*, /dev/ttyUSB*) sous WSL — l'attache a peut-être échoué, "
            "ou ce dongle n'expose pas de port série standard."
        )
    device_path = paths[0]
    log(f"Périphérique résolu : {device_path}")

    _propagate_device_path(repo_path, device_path, _guess_adapter(device["vidpid"]), log)


# Vendor IDs des coordinateurs deCONZ (Dresden Elektronik : ConBee II/III ; FTDI : ConBee I) — tout
# le reste est supposé être une puce Texas Instruments (Sonoff Zigbee 3.0 Plus et clones). Comme
# sur macOS (voir zigbee_macos._guess_adapter), serial.adapter doit toujours être fixé : un
# "zstack" sur un ConBee ouvre bien le port, mais échoue ensuite avec "Not supported, cannot set".
_DECONZ_VENDOR_IDS = {"1cf1", "0403"}


def _guess_adapter(vidpid: str) -> str:
    return "deconz" if vidpid.split(":")[0].lower() in _DECONZ_VENDOR_IDS else "zstack"


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
    _start_auto_attach(busid)
    time.sleep(3)
    _load_serial_drivers(log)
    log(f"Capteur Zigbee ({busid}) réattaché à WSL après le démarrage de l'app.")


def _start_auto_attach(busid: str) -> None:
    # Popen, pas _run : --auto-attach tourne en continu (pour réattacher après un
    # débranchement/reset) et ne se termine jamais tant qu'on en a besoin. Pas de nom de
    # distribution : usbipd 5.x n'accepte plus "--distribution" et choisit lui-même celle de
    # Docker Desktop (le périphérique est de toute façon visible dans toutes les distributions WSL2).
    subprocess.Popen(
        [_usbipd(), "attach", "--wsl", "--busid", busid, "--auto-attach"],
        creationflags=_CREATION_FLAGS,
    )


# Pilotes série USB des dongles courants : cdc_acm (ConBee II/III), cp210x (Sonoff), ftdi_sio
# (ConBee I), ch341 (clones). Modules du noyau WSL que la distribution docker-desktop ne charge pas
# d'elle-même (pas d'udev), et à recharger après chaque redémarrage de WSL.
_SERIAL_MODULES = ("cdc_acm", "cp210x", "ftdi_sio", "ch341")


def _load_serial_drivers(log: LogFn) -> None:
    log("Chargement des pilotes série USB dans WSL...")
    # Erreurs ignorées module par module : un pilote absent du noyau ne doit pas bloquer les autres,
    # et la résolution du port juste après signale de toute façon s'il n'y a rien.
    _run(["wsl", "-d", _WSL_DISTRIBUTION, "-u", "root", "--", "sh", "-c",
          f"for m in {' '.join(_SERIAL_MODULES)}; do modprobe $m 2>/dev/null; done; true"])


def _propagate_device_path(repo_path: Path, device_path: str, adapter: str, log: LogFn) -> None:
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
    content, count = re.subn(
        r"(serial:.*?\n\s*adapter:\s*)\S*", rf"\1{adapter}", content, count=1, flags=re.DOTALL
    )
    if count == 0:
        # Pas de clé "adapter:" (config écrite à la main) : ajoutée juste sous serial.port.
        content = re.sub(
            r"(serial:.*?\n(\s*)port:[^\n]*)", rf"\1\n\g<2>adapter: {adapter}", content, count=1,
            flags=re.DOTALL,
        )
    config_file.write_text(content, encoding="utf-8")
    log(f"{config_file} mis à jour (serial.port = {device_path}, adapter = {adapter}).")

    env_path = repo_path / ".env"
    env_content = env_path.read_text(encoding="utf-8")
    env_path.write_text(set_env_var(env_content, "ZIGBEE_SERIAL_DEVICE", device_path), encoding="utf-8")
    log(".env mis à jour (ZIGBEE_SERIAL_DEVICE).")

    log("Redémarrage du conteneur zigbee2mqtt...")
    # --force-recreate : un simple "up -d" laisse tourner un conteneur déjà démarré, sans relire
    # configuration.yaml (fichier monté, pas une option du conteneur).
    _run(["docker", "compose", "up", "-d", "--force-recreate", "zigbee2mqtt"], log=log, timeout=120,
         cwd=repo_path)
    log("Capteur Zigbee connecté.")
