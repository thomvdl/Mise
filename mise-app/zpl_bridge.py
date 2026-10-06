"""
Pont TCP -> imprimante USB pour étiquettes ZPL, à faire tourner nativement sur Windows (mini PC
en cuisine) — PAS dans Docker : Docker Desktop sur Windows ne donne pas aux conteneurs un accès
direct au périphérique USB de l'imprimante.

Rôle : écouter sur le port 9100 (celui que mise-api utilise déjà pour parler à une Zebra réseau —
voir mise-api/app/Http/Controllers/PrintedLabelController.php, PRINTER_PORT) et transmettre tel
quel (sans aucune réinterprétation) tout ce qui arrive vers l'imprimante installée sous Windows,
via l'API d'impression RAW (datatype "RAW" — contourne tout traitement du pilote, qui pourrait
casser le ZPL brut).

Pré-requis :
- Imprimante installée dans Windows. Pour que l'impression RAW passe sans y toucher, utilisez de
  préférence le pilote générique "Generic / Text Only" plutôt que le pilote ZDesigner propre à la
  Zebra (certains pilotes ZDesigner réinterprètent les données même en RAW) — ou testez avec votre
  pilote actuel, ça fonctionne aussi dans la plupart des cas.
- Python 3 + pywin32 :
    pip install pywin32

Usage :
    python zpl_bridge.py "Nom exact de l'imprimante tel qu'affiché dans Windows"

Pour le faire tourner automatiquement au démarrage (sans session utilisateur ouverte), créez une
tâche planifiée Windows (Planificateur de tâches) :
  - Déclencheur : "Au démarrage de l'ordinateur"
  - Action : lancer `pythonw.exe` (pas python.exe, pour ne pas garder une fenêtre de console
    ouverte) avec ce script et le nom de l'imprimante en argument.
  - Cocher "Exécuter que l'utilisateur soit connecté ou non".

Côté MISE : dans le dashboard, Paramètres -> Impression d'étiquettes, réglez l'adresse imprimante
sur `host.docker.internal` (nom spécial que Docker Desktop résout automatiquement vers cette
machine Windows elle-même, depuis n'importe quel conteneur) — le port reste 9100, déjà fixé côté
API.
"""

import socket
import sys

import win32print

LISTEN_PORT = 9100
# Combien d'octets lire par paquet réseau — une étiquette ZPL tient largement dans quelques Ko,
# pas besoin d'un buffer énorme.
RECV_CHUNK = 4096


def print_raw(printer_name: str, data: bytes) -> None:
    handle = win32print.OpenPrinter(printer_name)
    try:
        # Datatype "RAW" : le spouleur Windows transmet les octets tels quels au pilote, sans les
        # réinterpréter comme du texte/une image — indispensable pour du ZPL brut.
        job = win32print.StartDocPrinter(handle, 1, ("Étiquette ZPL", None, "RAW"))
        try:
            win32print.StartPagePrinter(handle)
            win32print.WritePrinter(handle, data)
            win32print.EndPagePrinter(handle)
        finally:
            win32print.EndDocPrinter(handle)
    finally:
        win32print.ClosePrinter(handle)


def main() -> None:
    if len(sys.argv) != 2:
        print('Usage : python zpl_bridge.py "Nom exact de l\'imprimante"')
        sys.exit(1)

    printer_name = sys.argv[1]

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", LISTEN_PORT))
    server.listen(5)
    print(f"Pont ZPL en écoute sur le port {LISTEN_PORT}, imprimante cible : {printer_name!r}")

    while True:
        conn, addr = server.accept()
        with conn:
            chunks = []
            while chunk := conn.recv(RECV_CHUNK):
                chunks.append(chunk)
            data = b"".join(chunks)

            if not data:
                continue

            try:
                print_raw(printer_name, data)
                print(f"{addr[0]} -> {len(data)} octets imprimés")
            except Exception as exc:  # noqa: BLE001 — on log et on continue d'écouter, une
                # étiquette ratée ne doit pas arrêter le pont pour les suivantes.
                print(f"Échec d'impression ({addr[0]}) : {exc}")


if __name__ == "__main__":
    main()
