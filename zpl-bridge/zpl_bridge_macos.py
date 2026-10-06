"""Pont TCP -> imprimante USB pour macOS, à faire tourner nativement sur le mini PC (PAS dans
Docker : Docker Desktop sur macOS ne donne pas non plus aux conteneurs un accès direct au
périphérique USB, même limitation que sur Windows — voir README.md).

Contrairement à Windows, pas d'impression RAW possible via le spouleur système sur macOS récent :
Apple a retiré le support des files d'attente CUPS "brutes" (`lpadmin -m raw` échoue avec "les
files d'attente brutes ne sont plus prises en charge sur macOS"). On parle donc directement au
périphérique USB avec pyusb/libusb, en contournant complètement CUPS.

Pré-requis :
- Homebrew + libusb :
    brew install libusb
- Python 3 + pyusb :
    pip install pyusb

Usage :
    python3 zpl_bridge_macos.py

Côté MISE : dans le dashboard, Paramètres -> Impression d'étiquettes, réglez l'adresse imprimante
sur `host.docker.internal` (nom spécial que Docker Desktop résout automatiquement vers cette
machine macOS elle-même, depuis n'importe quel conteneur) — le port reste 9100, déjà fixé côté API.
"""

import socket
import sys

import usb.core
import usb.util

VENDOR_ID_ZEBRA = 0x0A5F
LISTEN_PORT = 9100
RECV_CHUNK = 4096


def get_device_and_out_endpoint():
    dev = usb.core.find(idVendor=VENDOR_ID_ZEBRA)
    if dev is None:
        raise RuntimeError("Aucune imprimante Zebra trouvée sur l'USB (vendor id 0x0A5F)")

    cfg = dev.get_active_configuration()
    intf = cfg[(0, 0)]
    ep_out = usb.util.find_descriptor(
        intf,
        custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress)
        == usb.util.ENDPOINT_OUT,
    )
    if ep_out is None:
        raise RuntimeError("Pas d'endpoint OUT trouvé sur l'interface d'impression")

    return dev, ep_out


def main() -> None:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", LISTEN_PORT))
    server.listen(5)
    print(f"Pont ZPL (macOS/USB direct) en écoute sur le port {LISTEN_PORT}", flush=True)

    while True:
        conn, addr = server.accept()
        with conn:
            chunks = []
            while chunk := conn.recv(RECV_CHUNK):
                chunks.append(chunk)
            data = b"".join(chunks)

            if not data:
                continue

            dev = None
            try:
                dev, ep_out = get_device_and_out_endpoint()
                written = ep_out.write(data, timeout=5000)
                print(f"{addr[0]} -> {written} octets imprimés", flush=True)
            except Exception as exc:  # noqa: BLE001 — on log et on continue d'écouter, une
                # étiquette ratée ne doit pas arrêter le pont pour les suivantes.
                print(f"Échec d'impression ({addr[0]}) : {exc}", flush=True, file=sys.stderr)
            finally:
                # Relâche l'interface USB entre deux étiquettes : sans ça, une deuxième impression
                # juste après (ou un script de test lancé à côté) échoue avec "Access denied" —
                # rien d'autre ne referme l'interface tant que le pont tourne.
                if dev is not None:
                    usb.util.dispose_resources(dev)


if __name__ == "__main__":
    main()
