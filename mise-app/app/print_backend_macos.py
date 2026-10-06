"""Backend d'impression macOS : parle directement au périphérique USB de la Zebra via `pyusb`,
sans passer par CUPS — macOS récent a retiré le support des files d'attente "brutes"
(`lpadmin -m raw` échoue), donc pas d'impression RAW possible via le spouleur système comme sur
Windows. Détection automatique par vendor ID USB, pas de configuration requise (contrairement à
`print_backend_windows.py`, qui doit connaître un nom d'imprimante installé).

En dev, `pyusb` trouve `libusb` tout seul (installé via `brew install libusb`, voir README). Mais
le mini PC cible n'a pas forcément Homebrew — on bundle donc le `.dylib` dans l'app empaquetée
(voir `packaging/macos.spec`) et on force explicitement ce chemin-là une fois frozen, plutôt que
de compter sur la détection automatique de `pyusb` qui ne regarde que les emplacements système
habituels.
"""

import sys

import usb.backend.libusb1
import usb.core
import usb.util

VENDOR_ID_ZEBRA = 0x0A5F


def _bundled_backend():
    if not getattr(sys, "frozen", False):
        return None
    import os

    bundled_dylib = os.path.join(sys._MEIPASS, "libusb-1.0.0.dylib")
    return usb.backend.libusb1.get_backend(find_library=lambda _name: bundled_dylib)


class MacOsPrintBackend:
    def __init__(self) -> None:
        self._backend = _bundled_backend()

    def _find_device(self):
        return usb.core.find(idVendor=VENDOR_ID_ZEBRA, backend=self._backend)

    def is_available(self) -> bool:
        return self._find_device() is not None

    def describe(self) -> str:
        dev = self._find_device()
        if dev is None:
            return "Aucune imprimante Zebra détectée sur l'USB"
        try:
            return f"{dev.manufacturer} {dev.product} (série {dev.serial_number})"
        except Exception:  # noqa: BLE001 — lecture des chaînes USB best-effort pour l'affichage
            return "Imprimante Zebra détectée (USB)"

    def send(self, data: bytes) -> None:
        dev = self._find_device()
        if dev is None:
            raise RuntimeError("Imprimante Zebra introuvable sur l'USB")

        try:
            cfg = dev.get_active_configuration()
            intf = cfg[(0, 0)]
            ep_out = usb.util.find_descriptor(
                intf,
                custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress)
                == usb.util.ENDPOINT_OUT,
            )
            if ep_out is None:
                raise RuntimeError("Pas d'endpoint OUT trouvé sur l'interface d'impression")
            ep_out.write(data, timeout=5000)
        finally:
            # Relâche l'interface USB après chaque impression : sans ça, l'impression suivante (ou
            # un script de test lancé à côté) échoue avec "Access denied" — rien d'autre ne
            # referme l'interface tant que l'app tourne.
            usb.util.dispose_resources(dev)
