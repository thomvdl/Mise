"""Détection de l'IP locale de la machine sur le réseau — utilisée pour les QR codes de connexion
(voir status_window.py). Le `connect()` UDP ci-dessous n'envoie rien sur le réseau : il demande
juste au système quelle interface locale serait utilisée pour atteindre cette adresse, ce qui
donne l'IP réseau réelle de la machine (pas 127.0.0.1) même sans connexion internet active."""

import socket


def local_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()
