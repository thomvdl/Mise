"""Fenêtre de statut (tkinter) — ouverte depuis l'icône de barre système (voir tray_icon.py).
Reste cachée au lancement (`withdraw`) et à la fermeture (la croix ne quitte pas l'app, voir
main.py : le pont continue de tourner en arrière-plan tant que l'icône système est là).
"""

import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import Callable, Optional

from . import config, kiosk, project

# Étiquette minimale pour le bouton de test — juste de quoi confirmer que le pont et l'imprimante
# répondent, pas une vraie étiquette HACCP (voir ZplLabelBuilder côté API pour le vrai format).
_TEST_ZPL = b"^XA\n^CI28\n^PW304\n^LL200\n^CF0,40\n^FO20,20^FDTest pont ZPL^FS\n^XZ\n"

# `~JC` déclenche la calibration support (mesure la longueur réelle du gap entre étiquettes) —
# trouvé plus fiable que la variable SGD `media.calibrate` en test (celle-ci a donné une longueur
# mesurée fausse à plusieurs reprises sur la Zebra ZD410, ~JC a donné la bonne du premier coup).
_CALIBRATE_ZPL = b"~JC"


def _ruler_zpl(width_dots: int = 456, height_dots: int = 256) -> bytes:
    """Étiquette graduée (un trait + un chiffre tous les 20 dots) pour mesurer à l'œil la vraie
    zone morte en haut d'impression de CETTE imprimante — un trou mécanique tête/capteur, pas un
    réglage logiciel (voir `label_top_offset_mm` côté dashboard, à renseigner avec la valeur lue
    ici). Dimensions par défaut calées sur une étiquette 57x32mm à 203dpi, assez large pour la
    plupart des formats utilisés."""
    parts = [f"^XA^CI28^PW{width_dots}^LL{height_dots}"]
    for y in range(0, height_dots - 15, 20):
        parts.append(f"^FO0,{y}^GB{width_dots},2,2^FS")
        parts.append(f"^FO4,{y + 3}^A0N,16,16^FD{y}^FS")
    parts.append("^XZ")
    return "".join(parts).encode()


def _ask_string(parent: tk.Misc, title: str, prompt: str, show: Optional[str] = None) -> Optional[str]:
    """Remplace `tkinter.simpledialog.askstring` — cassé sous Tk 9 sur macOS (plante avec
    `invalid command name "::tk::unsupported::MacWindowStyle"`, une commande Tcl interne que Tk 9
    a retirée mais que `simpledialog._setup_dialog` continue d'appeler ; confirmé en lançant l'app
    depuis un terminal pour voir la trace). Ne fait que ce dont on a besoin : un Toplevel modal
    avec un champ texte, sans passer par ce code interne cassé."""
    result: dict[str, Optional[str]] = {"value": None}
    dialog = tk.Toplevel(parent)
    dialog.title(title)
    dialog.resizable(False, False)
    dialog.transient(parent)

    ttk.Label(dialog, text=prompt, wraplength=360, justify="left").pack(padx=16, pady=(16, 8))
    var = tk.StringVar()
    entry = ttk.Entry(dialog, textvariable=var, width=40)
    if show:
        entry.configure(show=show)
    entry.pack(padx=16, pady=(0, 12))
    entry.focus_set()

    def _confirm(_event=None) -> None:
        result["value"] = var.get()
        dialog.destroy()

    def _cancel(_event=None) -> None:
        dialog.destroy()

    btn_row = ttk.Frame(dialog)
    btn_row.pack(pady=(0, 16))
    ttk.Button(btn_row, text="Annuler", command=_cancel).pack(side="right", padx=(6, 16))
    ttk.Button(btn_row, text="OK", command=_confirm).pack(side="right")

    dialog.bind("<Return>", _confirm)
    dialog.bind("<Escape>", _cancel)
    dialog.protocol("WM_DELETE_WINDOW", _cancel)

    dialog.update_idletasks()
    dialog.grab_set()
    parent.wait_window(dialog)
    return result["value"]


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
        self.window.geometry("460x740")
        self.window.resizable(False, False)
        self.window.withdraw()
        self.window.protocol("WM_DELETE_WINDOW", self.window.withdraw)

        self.status_label = ttk.Label(self.window, text="…", font=("TkDefaultFont", 12, "bold"))
        self.status_label.pack(anchor="w", padx=14, pady=(14, 6))

        if sys.platform == "win32":
            self._build_printer_picker()

        self._build_project_section()
        self._build_kiosk_section()

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

        printer_btn_row = ttk.Frame(self.window)
        printer_btn_row.pack(fill="x", padx=14, pady=(0, 6))
        ttk.Button(printer_btn_row, text="Imprimer une étiquette de test", command=self._print_test).pack(
            side="left"
        )
        ttk.Button(printer_btn_row, text="Recalibrer", command=self._recalibrate).pack(side="left", padx=(6, 0))
        ttk.Button(printer_btn_row, text="Étiquette de mesure", command=self._print_ruler).pack(
            side="left", padx=(6, 0)
        )

        btn_row = ttk.Frame(self.window)
        btn_row.pack(fill="x", padx=14, pady=(0, 14))
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
        btn_row.pack(fill="x", padx=8, pady=(0, 4))
        self.install_button = ttk.Button(btn_row, text="Installer", command=self._install)
        self.install_button.pack(side="left")
        self.update_button = ttk.Button(btn_row, text="Mettre à jour", command=self._update_project)
        self.update_button.pack(side="left", padx=(6, 0))

        backup_row = ttk.Frame(frame)
        backup_row.pack(fill="x", padx=8, pady=(0, 8))
        self.backup_button = ttk.Button(backup_row, text="Sauvegarder", command=self._backup_now)
        self.backup_button.pack(side="left")
        self.restore_button = ttk.Button(backup_row, text="Restaurer…", command=self._restore)
        self.restore_button.pack(side="left", padx=(6, 0))

        self.server_status_label = ttk.Label(frame, text="…")
        self.server_status_label.pack(anchor="w", padx=8, pady=(0, 2))

        server_row = ttk.Frame(frame)
        server_row.pack(fill="x", padx=8, pady=(0, 8))
        self.start_server_button = ttk.Button(server_row, text="Démarrer le serveur", command=self._start_server)
        self.start_server_button.pack(side="left")
        self.stop_server_button = ttk.Button(server_row, text="Arrêter le serveur", command=self._stop_server)
        self.stop_server_button.pack(side="left", padx=(6, 0))

    def _repo_path(self) -> Path:
        cfg = config.load()
        configured = cfg.get("repo_path")
        return Path(configured) if configured else Path.home() / "Mise"

    def _build_kiosk_section(self) -> None:
        frame = ttk.LabelFrame(self.window, text="Mode brigade (kiosk)")
        frame.pack(fill="x", padx=14, pady=(0, 10))

        ttk.Label(frame, text="Adresse mise-public :").pack(anchor="w", padx=8, pady=(8, 2))
        cfg = config.load()
        self.kiosk_url_var = tk.StringVar(value=cfg.get("kiosk_url") or "http://localhost:8082")
        url_entry = ttk.Entry(frame, textvariable=self.kiosk_url_var, width=40)
        url_entry.pack(fill="x", padx=8)
        url_entry.bind("<FocusOut>", lambda _event: self._save_kiosk_url())

        row = ttk.Frame(frame)
        row.pack(fill="x", padx=8, pady=8)
        ttk.Button(row, text="Lancer", command=self._launch_kiosk).pack(side="left")

        self.kiosk_autostart_var = tk.BooleanVar(value=bool(cfg.get("kiosk_autostart")))
        ttk.Checkbutton(
            row,
            text="Lancer au démarrage de l'app",
            variable=self.kiosk_autostart_var,
            command=self._toggle_kiosk_autostart,
        ).pack(side="left", padx=(10, 0))

    def _save_kiosk_url(self) -> None:
        cfg = config.load()
        cfg["kiosk_url"] = self.kiosk_url_var.get().strip() or "http://localhost:8082"
        config.save(cfg)

    def _toggle_kiosk_autostart(self) -> None:
        cfg = config.load()
        cfg["kiosk_autostart"] = self.kiosk_autostart_var.get()
        config.save(cfg)

    def _launch_kiosk(self) -> None:
        self._save_kiosk_url()
        url = self.kiosk_url_var.get().strip()
        try:
            kiosk.launch(url, self.events.add)
        except Exception as exc:  # noqa: BLE001 — affiché dans le journal, pas une exception à
            # laisser remonter jusqu'à l'UI.
            self.events.add(f"Échec du lancement du mode kiosque : {exc}", level="error")
        self.refresh()

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
        self.backup_button.config(state="normal" if (not self._busy and cloned) else "disabled")
        self.restore_button.config(state="normal" if (not self._busy and cloned) else "disabled")

        if not cloned:
            self.server_status_label.config(text="")
            self.start_server_button.config(state="disabled")
            self.stop_server_button.config(state="disabled")
            return

        status = project.server_status(repo_path) if project.is_docker_available() else "unknown"
        icons = {"running": "🟢", "partial": "🟡", "stopped": "🔴", "unknown": "⬜"}
        labels = {
            "running": "Serveur démarré",
            "partial": "Serveur partiellement démarré",
            "stopped": "Serveur arrêté",
            "unknown": "État du serveur inconnu (Docker indisponible ?)",
        }
        self.server_status_label.config(text=f"{icons[status]} {labels[status]}")
        self.start_server_button.config(
            state="normal" if (not self._busy and status in ("stopped", "partial", "unknown")) else "disabled"
        )
        self.stop_server_button.config(
            state="normal" if (not self._busy and status in ("running", "partial")) else "disabled"
        )

    def _install(self) -> None:
        if self._busy:
            return
        repo_path = self._repo_path()
        if project.is_repo_cloned(repo_path):
            return

        self._activate()
        # Retour immédiat au clic : les vérifications ci-dessous (et surtout can_access_remote,
        # un vrai aller-retour réseau) peuvent prendre quelques secondes sur le thread principal
        # — sans ça, l'app paraît ne rien faire pendant ce délai.
        self.events.add("Vérification de Git/Docker...")
        self.refresh()

        if not project.is_git_available():
            messagebox.showerror("Mise", "Git n'est pas installé (ou pas dans le PATH).")
            return
        if not project.is_docker_available():
            messagebox.showerror("Mise", "Docker n'est pas installé, ou pas démarré.")
            return

        github_token = None
        if not project.can_access_remote():
            github_token = _ask_string(
                self.window,
                "Mise",
                "Le dépôt GitHub est privé et aucun accès n'est enregistré sur cette machine.\n"
                "Jeton d'accès personnel GitHub (Settings → Developer settings → "
                "Personal access tokens, droit « repo ») :",
                show="*",
            )
            if not github_token:
                return

        admin_name = _ask_string(self.window, "Mise", "Nom du compte administrateur :")
        if not admin_name:
            return
        admin_password = _ask_string(self.window, "Mise", "Mot de passe administrateur :", show="*")
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
        self._activate()
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

    def _start_server(self) -> None:
        if self._busy:
            return
        repo_path = self._repo_path()
        if not project.is_repo_cloned(repo_path):
            return
        self._activate()
        if not project.is_docker_available():
            messagebox.showerror("Mise", "Docker n'est pas installé, ou pas démarré.")
            return

        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(project.start_server, (repo_path,)),
            daemon=True,
        ).start()

    def _stop_server(self) -> None:
        if self._busy:
            return
        repo_path = self._repo_path()
        if not project.is_repo_cloned(repo_path):
            return
        self._activate()
        if not project.is_docker_available():
            messagebox.showerror("Mise", "Docker n'est pas installé, ou pas démarré.")
            return

        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(project.stop_server, (repo_path,)),
            daemon=True,
        ).start()

    def _backup_now(self) -> None:
        if self._busy:
            return
        repo_path = self._repo_path()
        if not project.is_repo_cloned(repo_path):
            return
        self._activate()
        if not project.is_docker_available():
            messagebox.showerror("Mise", "Docker n'est pas installé, ou pas démarré.")
            return

        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(project.backup_db, (repo_path,)),
            daemon=True,
        ).start()

    def _restore(self) -> None:
        if self._busy:
            return
        repo_path = self._repo_path()
        if not project.is_repo_cloned(repo_path):
            return
        self._activate()
        if not project.is_docker_available():
            messagebox.showerror("Mise", "Docker n'est pas installé, ou pas démarré.")
            return

        chosen = filedialog.askopenfilename(
            title="Choisir une sauvegarde à restaurer",
            initialdir=str(repo_path),
            filetypes=[("Sauvegardes Mise", "*.sql.gz"), ("Tous les fichiers", "*.*")],
        )
        if not chosen:
            return

        confirmed = messagebox.askyesno(
            "Mise",
            f"Restaurer « {Path(chosen).name} » ?\n\n"
            "Ça écrase la base de données actuelle avec le contenu de cette sauvegarde. Une "
            "sauvegarde de sécurité de l'état actuel sera prise automatiquement avant, mais "
            "cette action reste irréversible sans elle.",
            icon="warning",
        )
        if not confirmed:
            return

        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(project.restore, (repo_path, Path(chosen))),
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

    def _activate(self) -> None:
        # L'app est une "accessory app" (LSUIElement, pas d'icône Dock) — sans activation
        # explicite, macOS ne la passe jamais au premier plan : une fenêtre (ou une boîte de
        # dialogue, ex. simpledialog/messagebox) peut rester dessinée vide, ou s'ouvrir cachée
        # derrière une autre app, tant qu'on ne force pas ça. À appeler avant d'afficher quoi que
        # ce soit (voir open() et les boîtes de dialogue de _install()/_restore()).
        if sys.platform != "darwin":
            return
        try:
            from AppKit import NSApplication

            NSApplication.sharedApplication().activateIgnoringOtherApps_(True)
        except Exception:  # noqa: BLE001 — continuer même si l'activation échoue (ex. PyObjC
            # manquant en dev hors venv complet).
            pass

    def open(self) -> None:
        self.refresh()
        self._activate()
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

    def _recalibrate(self) -> None:
        """Mesure la longueur réelle du support chargé (`~JC`, voir _CALIBRATE_ZPL) — à relancer
        après chaque changement de rouleau. Fait avancer 2-3 étiquettes, c'est normal."""
        try:
            self.backend.send(_CALIBRATE_ZPL)
            self.events.add("Calibration support lancée (quelques étiquettes vont défiler)")
        except Exception as exc:  # noqa: BLE001 — voir _print_test
            self.events.add(f"Échec de la calibration : {exc}", level="error")
        self.refresh()

    def _print_ruler(self) -> None:
        """Imprime une étiquette graduée pour mesurer à l'œil la zone morte mécanique en haut de
        l'impression (voir _ruler_zpl) — le chiffre lu en premier visible, en dots, est la valeur à
        reporter dans `label_top_offset_mm` côté dashboard (÷ 7,99 pour du 203dpi → mm)."""
        try:
            self.backend.send(_ruler_zpl())
            self.events.add("Étiquette de mesure envoyée — relève le premier chiffre visible en haut")
        except Exception as exc:  # noqa: BLE001 — voir _print_test
            self.events.add(f"Échec de l'impression de mesure : {exc}", level="error")
        self.refresh()

    def _quit(self) -> None:
        if self._quit_callback:
            self._quit_callback()
