"""Fenêtre de statut (tkinter) — ouverte depuis l'icône de barre système (voir tray_icon.py).
Reste cachée au lancement (`withdraw`) et à la fermeture (la croix ne quitte pas l'app, voir
main.py : le pont continue de tourner en arrière-plan tant que l'icône système est là).
"""

import sys
import tkinter as tk
from tkinter import ttk
from typing import Callable, Optional

from . import config

# Étiquette minimale pour le bouton de test — juste de quoi confirmer que le pont et l'imprimante
# répondent, pas une vraie étiquette HACCP (voir ZplLabelBuilder côté API pour le vrai format).
_TEST_ZPL = b"^XA\n^CI28\n^PW304\n^LL200\n^CF0,40\n^FO20,20^FDTest pont ZPL^FS\n^XZ\n"


class StatusWindow:
    def __init__(self, root: tk.Tk, backend, events, autostart_module, get_executable_path: Callable[[], str]):
        self.backend = backend
        self.events = events
        self.autostart = autostart_module
        self.get_executable_path = get_executable_path
        self._quit_callback: Optional[Callable[[], None]] = None

        self.window = tk.Toplevel(root)
        self.window.title("Pont ZPL — Mise")
        self.window.geometry("440x380")
        self.window.resizable(False, False)
        self.window.withdraw()
        self.window.protocol("WM_DELETE_WINDOW", self.window.withdraw)

        self.status_label = ttk.Label(self.window, text="…", font=("TkDefaultFont", 12, "bold"))
        self.status_label.pack(anchor="w", padx=14, pady=(14, 6))

        if sys.platform == "win32":
            self._build_printer_picker()

        ttk.Label(self.window, text="Activité récente").pack(anchor="w", padx=14)
        self.events_list = tk.Listbox(self.window, height=9)
        self.events_list.pack(fill="both", expand=True, padx=14, pady=(2, 8))

        self.autostart_var = tk.BooleanVar(value=self.autostart.is_enabled())
        ttk.Checkbutton(
            self.window,
            text="Lancer au démarrage",
            variable=self.autostart_var,
            command=self._toggle_autostart,
        ).pack(anchor="w", padx=14, pady=(0, 8))

        btn_row = ttk.Frame(self.window)
        btn_row.pack(fill="x", padx=14, pady=(0, 14))
        ttk.Button(btn_row, text="Imprimer une étiquette de test", command=self._print_test).pack(side="left")
        ttk.Button(btn_row, text="Quitter", command=self._quit).pack(side="right")
        ttk.Button(btn_row, text="Recharger", command=self.refresh).pack(side="right", padx=(0, 6))

    def _build_printer_picker(self) -> None:
        from .print_backend_windows import WindowsPrintBackend

        frame = ttk.Frame(self.window)
        frame.pack(fill="x", padx=14, pady=(0, 10))
        ttk.Label(frame, text="Imprimante Windows :").pack(anchor="w")

        cfg = config.load()
        self.printer_var = tk.StringVar(value=cfg.get("windows_printer_name") or "")
        try:
            printers = WindowsPrintBackend.list_printers()
        except Exception:  # noqa: BLE001 — liste best-effort, le champ reste utilisable à la main
            printers = []

        picker = ttk.Combobox(frame, textvariable=self.printer_var, values=printers)
        picker.pack(fill="x")
        picker.bind("<<ComboboxSelected>>", lambda _event: self._save_printer_name())
        picker.bind("<FocusOut>", lambda _event: self._save_printer_name())

    def _save_printer_name(self) -> None:
        cfg = config.load()
        cfg["windows_printer_name"] = self.printer_var.get().strip() or None
        config.save(cfg)

    def set_quit_callback(self, callback: Callable[[], None]) -> None:
        self._quit_callback = callback

    def open(self) -> None:
        self.refresh()
        if sys.platform == "darwin":
            # L'app est une "accessory app" (LSUIElement, pas d'icône Dock) — sans activation
            # explicite, macOS ne la passe jamais au premier plan et la fenêtre reste dessinée
            # vide/blanche (jamais de focus clavier non plus) tant qu'on ne clique pas ailleurs
            # pour forcer un redraw.
            try:
                from AppKit import NSApplication

                NSApplication.sharedApplication().activateIgnoringOtherApps_(True)
            except Exception:  # noqa: BLE001 — l'ouverture de la fenêtre doit continuer même si
                # l'activation échoue (ex. PyObjC manquant en dev hors venv complet).
                pass
        self.window.deiconify()
        self.window.lift()
        self.window.focus_force()

    def refresh(self) -> None:
        available = self.backend.is_available()
        prefix = "🟢" if available else "🟠"
        self.status_label.config(text=f"{prefix} {self.backend.describe()}")

        self.events_list.delete(0, tk.END)
        for timestamp, level, message in self.events.recent():
            prefix = "⚠ " if level == "error" else ""
            self.events_list.insert(tk.END, f"{timestamp.strftime('%H:%M:%S')} — {prefix}{message}")

    def _toggle_autostart(self) -> None:
        if self.autostart_var.get():
            self.autostart.enable(self.get_executable_path())
        else:
            self.autostart.disable()

    def _print_test(self) -> None:
        try:
            self.backend.send(_TEST_ZPL)
            self.events.add("Étiquette de test envoyée")
        except Exception as exc:  # noqa: BLE001 — affiché dans le journal, pas une exception à
            # laisser remonter jusqu'à l'UI.
            self.events.add(f"Échec du test : {exc}", level="error")
        self.refresh()

    def _quit(self) -> None:
        if self._quit_callback:
            self._quit_callback()
