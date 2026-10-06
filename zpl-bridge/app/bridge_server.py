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

            with conn:
                chunks = []
                while chunk := conn.recv(RECV_CHUNK):
                    chunks.append(chunk)
                data = b"".join(chunks)

                if not data:
                    continue

                try:
                    self.backend.send(data)
                    self.events.add(f"{addr[0]} -> {len(data)} octets imprimés")
                except Exception as exc:  # noqa: BLE001 — une étiquette ratée ne doit pas arrêter
                    # le pont pour les suivantes.
                    self.events.add(f"Échec d'impression ({addr[0]}) : {exc}", level="error")
