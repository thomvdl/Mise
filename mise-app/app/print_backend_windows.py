"""Backend d'impression Windows : impression RAW via `win32print`, qui contourne toute
réinterprétation du pilote — indispensable pour envoyer du ZPL brut tel quel.

Contrairement à macOS, pas de détection automatique par vendor ID USB ici : l'imprimante doit déjà
être installée dans Windows (Paramètres → Imprimantes) et son nom exact configuré depuis la
fenêtre de statut de l'app (voir status_window.py), persistant via config.py. Pour que l'impression
RAW passe sans y toucher, le pilote "Generic / Text Only" est recommandé plutôt que le pilote
ZDesigner propre à la Zebra (certains pilotes ZDesigner réinterprètent les données même en RAW) —
mais le pilote déjà installé fonctionne aussi dans la plupart des cas.
"""

from typing import Callable, Optional

import win32print


class WindowsPrintBackend:
    def __init__(self, get_printer_name: Callable[[], Optional[str]]):
        # Indirection (callable) plutôt qu'un nom figé à la construction : le nom peut changer à
        # chaud depuis la fenêtre de statut, sans redémarrer le pont.
        self._get_printer_name = get_printer_name

    @staticmethod
    def list_printers() -> list[str]:
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        return sorted(p[2] for p in win32print.EnumPrinters(flags))

    def is_available(self) -> bool:
        name = self._get_printer_name()
        if not name:
            return False
        return name in self.list_printers()

    def describe(self) -> str:
        name = self._get_printer_name()
        if not name:
            return "Aucune imprimante configurée"
        return name if self.is_available() else f"{name} (introuvable — vérifiez Paramètres → Imprimantes)"

    def send(self, data: bytes) -> None:
        name = self._get_printer_name()
        if not name:
            raise RuntimeError("Aucune imprimante configurée — choisissez-la dans la fenêtre de statut")

        handle = win32print.OpenPrinter(name)
        try:
            # Datatype "RAW" : le spouleur transmet les octets tels quels au pilote, sans les
            # réinterpréter comme du texte/une image.
            win32print.StartDocPrinter(handle, 1, ("Étiquette ZPL", None, "RAW"))
            try:
                win32print.StartPagePrinter(handle)
                win32print.WritePrinter(handle, data)
                win32print.EndPagePrinter(handle)
            finally:
                win32print.EndDocPrinter(handle)
        finally:
            win32print.ClosePrinter(handle)
