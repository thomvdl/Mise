"""Fenêtre de statut (tkinter) — ouverte depuis l'icône de barre système (voir tray_icon.py).
Reste cachée au lancement (`withdraw`) et à la fermeture (la croix ne quitte pas l'app, voir
main.py : le pont continue de tourner en arrière-plan tant que l'icône système est là).
"""

import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, simpledialog, ttk
from typing import Callable, Optional

from . import config, project

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

        self._busy = False

        self.window = tk.Toplevel(root)
        self.window.title("Mise")
        self.window.geometry("460x560")
        self.window.resizable(False, False)
        self.window.withdraw()
        self.window.protocol("WM_DELETE_WINDOW", self.window.withdraw)

        self.status_label = ttk.Label(self.window, text="…", font=("TkDefaultFont", 12, "bold"))
        self.status_label.pack(anchor="w", padx=14, pady=(14, 6))

        if sys.platform == "win32":
            self._build_printer_picker()

        self._build_project_section()

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

    def _build_project_section(self) -> None:
        frame = ttk.LabelFrame(self.window, text="Projet Mise")
        frame.pack(fill="x", padx=14, pady=(0, 10))

        path_row = ttk.Frame(frame)
        path_row.pack(fill="x", padx=8, pady=(8, 2))
        self.project_path_label = ttk.Label(path_row, text="…")
        self.project_path_label.pack(side="left")
        ttk.Button(path_row, text="Dossier…", command=self._choose_repo_folder).pack(side="right")

        self.project_status_label = ttk.Label(frame, text="…")
        self.project_status_label.pack(anchor="w", padx=8, pady=(0, 6))

        btn_row = ttk.Frame(frame)
        btn_row.pack(fill="x", padx=8, pady=(0, 8))
        self.install_button = ttk.Button(btn_row, text="Installer", command=self._install)
        self.install_button.pack(side="left")
        self.update_button = ttk.Button(btn_row, text="Mettre à jour", command=self._update_project)
        self.update_button.pack(side="left", padx=(6, 0))

    def _repo_path(self) -> Path:
        cfg = config.load()
        configured = cfg.get("repo_path")
        return Path(configured) if configured else Path.home() / "Mise"

    def _choose_repo_folder(self) -> None:
        chosen = filedialog.askdirectory(
            title="Dossier du projet Mise", initialdir=str(self._repo_path().parent)
        )
        if not chosen:
            return
        cfg = config.load()
        cfg["repo_path"] = chosen
        config.save(cfg)
        self.refresh()

    def _refresh_project(self) -> None:
        repo_path = self._repo_path()
        self.project_path_label.config(text=str(repo_path))

        cloned = project.is_repo_cloned(repo_path)
        if cloned:
            commit = project.current_commit(repo_path)
            self.project_status_label.config(text=f"✅ Installé — commit {commit}")
        else:
            self.project_status_label.config(text="⬜ Pas encore installé dans ce dossier")

        self.install_button.config(state="disabled" if (self._busy or cloned) else "normal")
        self.update_button.config(state="normal" if (not self._busy and cloned) else "disabled")

    def _install(self) -> None:
        if self._busy:
            return
        repo_path = self._repo_path()
        if project.is_repo_cloned(repo_path):
            return
        if not project.is_git_available():
            messagebox.showerror("Mise", "Git n'est pas installé (ou pas dans le PATH).")
            return
        if not project.is_docker_available():
            messagebox.showerror("Mise", "Docker n'est pas installé, ou pas démarré.")
            return

        github_token = None
        if not project.can_access_remote():
            github_token = simpledialog.askstring(
                "Mise",
                "Le dépôt GitHub est privé et aucun accès n'est enregistré sur cette machine.\n"
                "Jeton d'accès personnel GitHub (Settings → Developer settings → "
                "Personal access tokens, droit « repo ») :",
                parent=self.window,
                show="*",
            )
            if not github_token:
                return

        admin_name = simpledialog.askstring("Mise", "Nom du compte administrateur :", parent=self.window)
        if not admin_name:
            return
        admin_password = simpledialog.askstring(
            "Mise", "Mot de passe administrateur :", parent=self.window, show="*"
        )
        if not admin_password:
            return

        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(project.install, (repo_path, admin_name, admin_password), {"github_token": github_token}),
            daemon=True,
        ).start()

    def _update_project(self) -> None:
        if self._busy:
            return
        repo_path = self._repo_path()
        if not project.is_repo_cloned(repo_path):
            return
        if not project.is_docker_available():
            messagebox.showerror("Mise", "Docker n'est pas installé, ou pas démarré.")
            return

        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(project.update, (repo_path,)),
            kwargs={},
            daemon=True,
        ).start()

    def _run_project_task(self, func: Callable, args: tuple, kwargs: Optional[dict] = None) -> None:
        # Tourne dans un thread à part — ne jamais toucher un widget Tkinter ici (voir main.py
        # pour la même contrainte côté callbacks pystray). `self.events.add` est thread-safe et
        # c'est le polling du thread principal (tick(), dans main.py) qui rafraîchira l'affichage.
        try:
            func(*args, self.events.add, **(kwargs or {}))
        except project.CommandError as exc:
            self.events.add(f"Échec : {exc}", level="error")
        except Exception as exc:  # noqa: BLE001 — une erreur inattendue ne doit pas laisser
            # l'app dans un état "occupé" indéfiniment.
            self.events.add(f"Erreur inattendue : {exc}", level="error")
        finally:
            self._busy = False

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

        self._refresh_project()

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
