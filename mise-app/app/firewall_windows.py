"""Pare-feu Windows pour les ponts d'impression (voir bridge_server.py) : c'est l'API centrale qui
ouvre la connexion vers `IP_du_poste:<port>` (voir ZplPrinter.php/EscposPrinter.php), pas ce poste
— une connexion ENTRANTE, que le pare-feu Windows bloque par défaut. Tant qu'elle l'est,
l'impression échoue côté API avec un "Connection timed out", sans rien dans le journal de l'app
(rien n'arrive jusqu'au pont).

Règle sur le PORT, pas sur le programme : la fenêtre "Autoriser l'accès" que Windows affiche au
premier lancement crée une règle liée au chemin de Mise.exe ET au profil réseau du moment
(Public/Privé) — à refaire après chaque déplacement de l'exe (installateur, dossier dist, Bureau...) ou
changement de profil du Wi-Fi, et une règle "Bloquer" si on ferme cette fenêtre sans cliquer.

Une règle par port (une par type d'imprimante, voir LISTEN_PORT/THERMAL_LISTEN_PORT) plutôt
qu'une règle unique couvrant les deux : un poste n'a pas forcément les deux imprimantes
configurées, pas la peine d'ouvrir un port qui ne sert à rien dessus.
"""

import base64
import subprocess
from typing import Callable

from .bridge_server import LISTEN_PORT, THERMAL_LISTEN_PORT
from .project import CommandError

LogFn = Callable[[str], None]

_CREATION_FLAGS = subprocess.CREATE_NO_WINDOW


def _rule_name(port: int) -> str:
    return f"Mise - imprimante (port {port})"


def _elevated_script(port: int) -> str:
    # Lancé en administrateur (voir allow_bridge_port). Désactive aussi les règles "Bloquer"
    # visant un mise.exe (créées en fermant la fenêtre "Autoriser l'accès" de Windows sans
    # cliquer) : dans le pare-feu Windows, une règle de blocage l'emporte toujours sur une règle
    # d'autorisation — la règle de port seule ne suffirait pas tant qu'elles restent actives.
    name = _rule_name(port)
    return f"""
$ErrorActionPreference = 'Stop'
$name = '{name}'
$existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
if ($existing) {{
    $existing | Set-NetFirewallRule -Enabled True -Action Allow -Direction Inbound -Profile Any
}} else {{
    New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort {port} `
        -Action Allow -Profile Any | Out-Null
}}
Get-NetFirewallApplicationFilter |
    Where-Object {{ $_.Program -like '*\\mise.exe' }} |
    Get-NetFirewallRule |
    Where-Object {{ $_.Direction -eq 'Inbound' -and $_.Action -eq 'Block' -and $_.Enabled -eq 'True' }} |
    Disable-NetFirewallRule
"""


def is_bridge_port_allowed(port: int = LISTEN_PORT) -> bool:
    """La règle de ce port existe-t-elle ? `netsh ... show rule` marche sans droits admin
    (contrairement à Get-NetFirewallPortFilter, "Accès refusé") et sort en code non nul quand
    aucune règle ne porte ce nom. Ne vérifie pas qu'elle est active ni qu'aucune règle "Bloquer"
    ne la contredit — le texte de netsh est traduit selon la langue de Windows, pas fiable à
    analyser ; allow_bridge_port() règle de toute façon ces deux cas."""
    try:
        result = subprocess.run(
            ["netsh", "advfirewall", "firewall", "show", "rule", f"name={_rule_name(port)}"],
            capture_output=True, timeout=10, creationflags=_CREATION_FLAGS,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    return result.returncode == 0


def is_thermal_bridge_port_allowed() -> bool:
    return is_bridge_port_allowed(THERMAL_LISTEN_PORT)


def allow_bridge_port(log: LogFn, port: int = LISTEN_PORT) -> None:
    """Crée (ou réactive) la règle d'autorisation du port du pont — demande une élévation (UAC).
    Script passé en -EncodedCommand plutôt qu'en argument texte : Start-Process -ArgumentList ne
    protège ni les espaces ni les guillemets du nom de la règle (voir zigbee_windows._run_elevated
    pour le même mécanisme d'élévation, sans ce problème car usbipd n'a que des arguments simples)."""
    log(f"Autorisation du port {port} dans le pare-feu Windows (confirmation administrateur)...")
    encoded = base64.b64encode(_elevated_script(port).encode("utf-16-le")).decode()
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             "$p = Start-Process -FilePath 'powershell' "
             f"-ArgumentList '-NoProfile','-EncodedCommand','{encoded}' "
             "-Verb RunAs -Wait -PassThru -WindowStyle Hidden; exit $p.ExitCode"],
            capture_output=True, text=True, timeout=120, creationflags=_CREATION_FLAGS,
        )
    except subprocess.TimeoutExpired as exc:
        raise CommandError("le pare-feu n'a pas répondu après 120s") from exc
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise CommandError(detail or "autorisation refusée ou échouée")
    log(f"Port {port} autorisé dans le pare-feu Windows")


def allow_thermal_bridge_port(log: LogFn) -> None:
    allow_bridge_port(log, THERMAL_LISTEN_PORT)
