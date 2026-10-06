"""Point d'entrée de l'app — icône de barre système + pont ZPL en fond + fenêtre de statut à la
demande. Remplace l'usage en ligne de commande des anciens zpl_bridge.py/zpl_bridge_macos.py (qui
restent dans le dossier pour un usage manuel/dépannage, voir README.md).

`pystray` et `tkinter` veulent chacun tourner sur le thread principal selon l'OS — on donne le
thread principal à tkinter (`root.mainloop()`) et on détache pystray dans un thread à lui via
`icon.run_detached()`, explicitement prévu par pystray pour ce genre de combinaison.
"""

import sys
import tkinter as tk

from . import autostart
from .bridge_server import BridgeServer
from .events import EventLog
from .status_window import StatusWindow
from .tray_icon import build_tray_icon, update_icon

if sys.platform == "darwin":
    from .print_backend_macos import MacOsPrintBackend as Backend
elif sys.platform == "win32":
    from .print_backend_windows import WindowsPrintBackend as Backend
else:
    raise RuntimeError(
        "Cette application ne couvre que macOS et Windows — sur Linux, Docker passe le "
        "périphérique USB directement au conteneur (voir docker-compose.linux-usb-printer.yml)."
    )

REFRESH_INTERVAL_MS = 3000


def get_executable_path() -> str:
    # `sys.executable` pointe vers l'exécutable PyInstaller une fois empaqueté, et vers
    # python/pythonw en développement — suffisant pour les deux usages visés ici.
    return sys.executable


def build_backend():
    if sys.platform == "win32":
        from . import config

        return Backend(lambda: config.load().get("windows_printer_name"))
    return Backend()


def main() -> None:
    events = EventLog()
    backend = build_backend()

    bridge = BridgeServer(backend, events)
    bridge.start()
    events.add("Pont démarré")

    root = tk.Tk()
    root.withdraw()

    status_window = StatusWindow(root, backend, events, autostart, get_executable_path)

    icon = build_tray_icon(
        open_status_window=lambda _icon=None, _item=None: root.after(0, status_window.open),
        quit_app=lambda _icon=None, _item=None: root.after(0, do_quit),
    )

    def do_quit() -> None:
        bridge.stop()
        icon.stop()
        root.quit()

    status_window.set_quit_callback(lambda: root.after(0, do_quit))

    def tick() -> None:
        update_icon(icon, backend.is_available())
        if status_window.window.state() != "withdrawn":
            status_window.refresh()
        root.after(REFRESH_INTERVAL_MS, tick)

    icon.run_detached()
    root.after(500, tick)
    root.mainloop()


if __name__ == "__main__":
    main()
