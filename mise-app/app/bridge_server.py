"""Boucle TCP:9100 partagée entre les deux OS — voir mise-api/app/Http/Controllers/
PrintedLabelController.php (PRINTER_PORT) côté serveur, qui parle à cette même adresse. La
réception/gestion du socket est identique partout ; seule l'impression effective diffère (voir
print_backend_macos.py / print_backend_windows.py), injectée ici comme dépendance.
"""

import socket
import threading

from .events import EventLog

LISTEN_PORT = 9100
RECV_CHUNK = 4096
# Évite qu'une connexion qui n'envoie jamais rien (ex. sondes/proxy réseau de Docker Desktop vers
# host.docker.internal, vu en prod : une connexion restée ouverte sans données a bloqué toute
# impression suivante) ne bloque indéfiniment la boucle le temps qu'elle attend recv().
CONN_TIMEOUT_SECONDS = 10


class BridgeServer:
    def __init__(self, backend, events: EventLog):
        self.backend = backend
        self.events = events
        self._socket: socket.socket | None = None
        self._thread: threading.Thread | None = None
        self._running = False

    def start(self) -> None:
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._socket is not None:
            try:
                self._socket.close()
            except OSError:
                pass

    def _run(self) -> None:
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            server.bind(("0.0.0.0", LISTEN_PORT))
        except OSError as exc:
            self.events.add(f"Impossible d'écouter sur le port {LISTEN_PORT} : {exc}", level="error")
            return

        server.listen(5)
        self._socket = server
        self.events.add(f"Pont en écoute sur le port {LISTEN_PORT}")

        while self._running:
            try:
                conn, addr = server.accept()
            except OSError:
                # Déclenché par stop() fermant le socket — sortie normale de la boucle.
                break

            # Chaque connexion dans son propre thread : une connexion lente/muette (ou un simple
            # port scan) ne doit jamais empêcher d'accepter les impressions suivantes pendant
            # qu'elle traîne dans recv().
            threading.Thread(target=self._handle_connection, args=(conn, addr), daemon=True).start()

    def _handle_connection(self, conn: socket.socket, addr) -> None:
        conn.settimeout(CONN_TIMEOUT_SECONDS)
        with conn:
            chunks = []
            try:
                while chunk := conn.recv(RECV_CHUNK):
                    chunks.append(chunk)
            except OSError:
                # Timeout ou connexion coupée brutalement — on imprime quand même ce qui a été
                # reçu jusque-là plutôt que de tout perdre silencieusement.
                pass
            data = b"".join(chunks)

            if not data:
                return

            try:
                self.backend.send(data)
                self.events.add(f"{addr[0]} -> {len(data)} octets imprimés")
            except Exception as exc:  # noqa: BLE001 — une étiquette ratée ne doit pas arrêter
                # le pont pour les suivantes.
                self.events.add(f"Échec d'impression ({addr[0]}) : {exc}", level="error")
