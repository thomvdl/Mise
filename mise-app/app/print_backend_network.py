"""Backends pour le ticket thermique quand il n'est PAS branché en USB sur ce poste, mais joignable
directement sur le réseau (Ethernet/WiFi) — ex. un Epson TM-m30 avec son interface réseau plutôt
que son câble USB. `NetworkPrintBackend` relaie alors les octets reçus vers cette IP:port au lieu
de les écrire sur un périphérique USB local, avec la même interface (is_available/describe/send)
que MacOsPrintBackend/WindowsPrintBackend — bridge_server.py ne voit aucune différence.

`ThermalPrintBackend` bascule entre les deux (USB ou réseau) selon le réglage choisi dans l'onglet
"Ticket (cuisine)" de la fenêtre de statut (voir status_window.py) : le reste de l'app (bridge,
icône de barre système) continue de parler à un seul objet backend, sans savoir lequel des deux
est réellement actif.
"""

import socket
from typing import Callable, Optional

# Port d'impression ESC/POS brut le plus courant sur l'interface réseau native des tickets Epson
# (convention "JetDirect"-like partagée par la quasi-totalité des imprimantes réseau, étiquettes
# comme tickets) — modifiable dans l'UI si le modèle réellement branché utilise un autre port.
DEFAULT_NETWORK_PORT = 9100

# Un vrai aller-retour réseau à chaque is_available()/describe() (appelés par refresh(), toutes
# les 3s tant que la fenêtre de statut est ouverte, voir main.py) — un délai généreux bloquerait
# l'UI (Tkinter tourne sur un seul thread) à chaque tick si l'imprimante est injoignable.
PROBE_TIMEOUT_SECONDS = 1.0
SEND_TIMEOUT_SECONDS = 5.0


class NetworkPrintBackend:
    def __init__(self, get_host: Callable[[], Optional[str]], get_port: Callable[[], int]):
        self._get_host = get_host
        self._get_port = get_port

    def is_available(self) -> bool:
        host = self._get_host()
        if not host:
            return False
        try:
            with socket.create_connection((host, self._get_port()), timeout=PROBE_TIMEOUT_SECONDS):
                return True
        except OSError:
            return False

    def describe(self) -> str:
        host = self._get_host()
        if not host:
            return "Aucune adresse réseau configurée"
        reachable = "joignable" if self.is_available() else "injoignable"
        return f"{host}:{self._get_port()} ({reachable})"

    def send(self, data: bytes) -> None:
        host = self._get_host()
        if not host:
            raise RuntimeError("Aucune adresse réseau configurée pour le ticket")
        with socket.create_connection((host, self._get_port()), timeout=SEND_TIMEOUT_SECONDS) as sock:
            sock.sendall(data)


class ThermalPrintBackend:
    """`get_mode()` renvoie "usb" ou "network" — lu à chaque appel (pas mis en cache) pour que le
    choix fait dans l'UI prenne effet immédiatement, sans redémarrer le pont."""

    def __init__(self, usb_backend, network_backend: NetworkPrintBackend, get_mode: Callable[[], str]):
        self._usb = usb_backend
        self._network = network_backend
        self._get_mode = get_mode

    def _active(self):
        return self._network if self._get_mode() == "network" else self._usb

    def is_available(self) -> bool:
        return self._active().is_available()

    def describe(self) -> str:
        return self._active().describe()

    def send(self, data: bytes) -> None:
        self._active().send(data)
