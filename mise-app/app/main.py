"""Point d'entrée de l'app — icône de barre système + pont ZPL en fond + fenêtre de statut à la
demande. Remplace l'usage en ligne de commande des anciens zpl_bridge.py/zpl_bridge_macos.py (qui
restent dans le dossier pour un usage manuel/dépannage, voir README.md).

`pystray` et `tkinter` veulent chacun tourner sur le thread principal selon l'OS — on donne le
thread principal à tkinter (`root.mainloop()`) et on détache pystray dans un thread à lui via
`icon.run_detached()`, explicitement prévu par pystray pour ce genre de combinaison.

Sur macOS, les callbacks du menu pystray (clic sur "Ouvrir"/"Quitter") s'exécutent sur ce thread
détaché, pas sur le thread principal — y appeler directement une méthode Tkinter (même via
`root.after`) fait planter l'app (`Fatal Python error: PyEval_RestoreThread: NULL tstate`, Tkinter
n'étant pilotable que depuis le thread qui fait tourner `mainloop()`). Les callbacks du menu se
contentent donc de déposer une action dans une `queue.Queue` thread-safe, et c'est `poll_actions()`
— planifiée par le thread principal lui-même — qui la consomme et appelle Tkinter.
"""

import queue
import sys
import threading
import tkinter as tk
from pathlib import Path

from . import autostart, config, project
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
        return Backend(lambda: config.load().get("windows_printer_name"))
    return Backend()


def ensure_project_running(events: EventLog) -> None:
    # Démarre la pile Docker du projet si elle est déjà installée — pas de --build ici (rapide,
    # juste pour s'assurer que tout tourne), l'installation initiale et les mises à jour se font
    # depuis la fenêtre de statut (voir status_window.py). Ne bloque jamais le démarrage de l'app
    # si Docker n'est pas prêt : c'est juste un confort, pas une dépendance dure.
    cfg = config.load()
    repo_path_str = cfg.get("repo_path")
    if not repo_path_str:
        return
    repo_path = Path(repo_path_str)
    if not project.is_repo_cloned(repo_path) or not project.is_docker_available():
        return

    def run() -> None:
        try:
            project.docker_up(repo_path, events.add)
        except project.CommandError as exc:
            events.add(f"Échec du démarrage automatique de la pile Docker : {exc}", level="error")

    threading.Thread(target=run, daemon=True).start()


def main() -> None:
    events = EventLog()
    backend = build_backend()

    bridge = BridgeServer(backend, events)
    bridge.start()
    events.add("Pont démarré")

    ensure_project_running(events)

    root = tk.Tk()
    root.withdraw()

    status_window = StatusWindow(root, backend, events, autostart, get_executable_path)

    actions: "queue.Queue[str]" = queue.Queue()

    icon = build_tray_icon(
        open_status_window=lambda _icon=None, _item=None: actions.put("open"),
        quit_app=lambda _icon=None, _item=None: actions.put("quit"),
    )

    def do_quit() -> None:
        bridge.stop()
        icon.stop()
        root.quit()

    # Appelé par le bouton "Quitter" de la fenêtre de statut (déjà sur le thread principal, via
    # un callback de bouton Tkinter) — pas besoin de passer par la queue ici.
    status_window.set_quit_callback(do_quit)

    def poll_actions() -> None:
        try:
            while True:
                action = actions.get_nowait()
                if action == "open":
                    status_window.open()
                elif action == "quit":
                    do_quit()
                    return  # root.quit() a été appelé : ne pas se replanifier.
        except queue.Empty:
            pass
        root.after(100, poll_actions)

    def tick() -> None:
        update_icon(icon, backend.is_available())
        if status_window.window.state() != "withdrawn":
            status_window.refresh()
        root.after(REFRESH_INTERVAL_MS, tick)

    icon.run_detached()
    root.after(100, poll_actions)
    root.after(500, tick)
    root.mainloop()


if __name__ == "__main__":
    main()
