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

from . import config, kiosk, network, project

if sys.platform == "win32":
    from . import firewall_windows
    from . import zigbee_windows as zigbee_backend
elif sys.platform == "darwin":
    from . import zigbee_macos as zigbee_backend

# Ports publiés par docker-compose.yml pour les apps web (voir aussi le défaut de kiosk_url
# ci-dessous, déjà calé sur 8082) — fixes pour ce projet, pas de config nécessaire.
_PUBLIC_PORT = 8082
_DASHBOARD_PORT = 8081

_DOTS_PER_MM_203DPI = 203 / 25.4


def _mm_to_dots(mm: float) -> int:
    return round(mm * _DOTS_PER_MM_203DPI)


# Formats de rouleau connus — mêmes presets que `LABEL_FORMAT_PRESETS` côté dashboard
# (mise-dashboard/src/app/components/printer-settings/printer-settings.ts), dupliqués ici car ce
# générateur ZPL est local à mise-app (pas d'appel API, décision prise pour rester simple — voir
# TODO.md). `top_offset_mm` compense la zone morte mécanique en haut d'impression (tête/capteur
# de gap décalés physiquement, mesurée via _ruler_zpl) : 7.5mm mesurés pour le 57x32mm non
# pivoté ; 0 pour le 36x89mm pivoté, jamais mesuré — ne PAS deviner une valeur ici, un mauvais
# offset dans l'autre sens pousserait le contenu hors de l'étiquette plutôt que dans la zone
# morte (même décision que côté dashboard, voir printer-settings.ts). Le rouleau pivoté fait
# réellement 36mm de large (pas 38 — un ancien preset à 38mm imprimait 1 étiquette correcte suivie
# de 2 étiquettes vierges, capteur de gap de l'imprimante déboussolé par l'écart).
_LABEL_FORMATS = [
    {"label": "57 × 32 mm", "width_mm": 57, "height_mm": 32, "rotate90": False, "top_offset_mm": 7.5},
    {"label": "36 × 89 mm (pivoté 90°)", "width_mm": 36, "height_mm": 89, "rotate90": True, "top_offset_mm": 0},
]


def _label_format_by_index(index: int) -> dict:
    if not isinstance(index, int) or not (0 <= index < len(_LABEL_FORMATS)):
        index = 0
    return _LABEL_FORMATS[index]


def _current_label_format() -> dict:
    return _label_format_by_index(config.load().get("label_format_index", 0))


def _test_zpl(fmt: dict) -> bytes:
    """Étiquette minimale pour le bouton de test — juste de quoi confirmer que le pont et
    l'imprimante répondent, pas une vraie étiquette HACCP (voir ZplLabelBuilder côté API pour le
    vrai format). `^FO` reste toujours en coordonnées physiques (x le long de `^PW`, y le long de
    `^LL`) qu'on soit pivoté ou non — seule l'orientation du champ texte (`^A0R` vs `^A0N`)
    change ; un seul champ, donc pas de question d'ordre d'empilement (voir `_qr_zpl` pour ce cas-
    là). Décalée de `top_offset_mm` sur l'axe Y — sinon le texte, collé en haut, se retrouve en
    partie ou totalement dans la zone morte mécanique."""
    width_dots = _mm_to_dots(fmt["width_mm"])
    height_dots = _mm_to_dots(fmt["height_mm"])
    y = 20 + _mm_to_dots(fmt["top_offset_mm"])
    orientation = "R" if fmt["rotate90"] else "N"
    return (
        f"^XA^CI28^PW{width_dots}^LL{height_dots}"
        f"^FO20,{y}^A0{orientation},40,40^FDTest pont ZPL^FS^XZ"
    ).encode()


def _test_escpos() -> bytes:
    """Ticket minimal pour le bouton de test — même rôle que `_test_zpl` ci-dessus côté Zebra :
    juste de quoi confirmer que ce second pont et l'imprimante thermique répondent, pas un vrai
    ticket de fiche technique (voir EscposFicheTechniqueBuilder côté API pour le vrai format).
    `\\x1B@` initialise l'imprimante, `\\x1D V 0` coupe le papier."""
    return b"\x1B@Test pont ticket\n\n\n\x1DV\x00"


# `^JUF` recharge les réglages d'usine Zebra (noirceur, vitesse, type de support...) sur
# l'imprimante active, et `^JUS` les sauvegarde pour qu'ils survivent au prochain redémarrage —
# sans ça, `^JUF` seul reviendrait aux dernières valeurs sauvegardées à la prochaine mise sous
# tension plutôt que de rester sur les valeurs d'usine. Ne touche pas les réglages réseau (`^JUN`
# fait ça séparément) ni le format d'étiquette (largeur/hauteur/rotation/offset), qui vit côté
# Settings de l'API et est injecté dans le ZPL à chaque impression par ZplLabelBuilder — pas
# stocké sur l'imprimante elle-même.
_FACTORY_DEFAULTS_ZPL = b"^XA^JUF^JUS^XZ"


def _ruler_zpl(width_dots: int = 456, height_dots: int = 256) -> bytes:
    """Étiquette graduée (un trait + un chiffre tous les 20 dots) pour mesurer à l'œil la vraie
    zone morte en haut d'impression de CETTE imprimante — un trou mécanique tête/capteur, pas un
    réglage logiciel (voir `label_top_offset_mm` côté dashboard, à renseigner avec la valeur lue
    ici). Appelant passe `width_dots`/`height_dots` du format actuellement sélectionné (voir
    `_current_label_format`) — pas de pivot ici volontairement : la zone morte est un fait
    mécanique du feed, indépendant de l'orientation du contenu, et lire la règle n'a pas besoin
    d'être \"dans le bon sens\" pour être mesurée."""
    parts = [f"^XA^CI28^PW{width_dots}^LL{height_dots}"]
    for y in range(0, height_dots - 15, 20):
        parts.append(f"^FO0,{y}^GB{width_dots},2,2^FS")
        parts.append(f"^FO4,{y + 3}^A0N,16,16^FD{y}^FS")
    parts.append("^XZ")
    return "".join(parts).encode()


def _qr_zpl(url: str, title: str, fmt: dict) -> bytes:
    """Étiquette QR code de connexion — `^BQ` est le format QR *natif* des imprimantes Zebra :
    l'imprimante génère elle-même le code à partir de la donnée brute. Le préfixe `QA` dans `^FD`
    = correction d'erreur niveau Q, saisie en mode automatique (voir ZPL II Programming Guide,
    commande ^BQ). Le QR lui-même reste toujours en orientation `N` (pas pivoté) : un QR se
    scanne à n'importe quel angle, pas besoin de le tourner avec le reste.

    Deux mises en page bien séparées plutôt qu'une seule formule générique — la bascule landscape
    (57x32, large/bas) vs portrait pivoté (36x89, étroit/long) change trop la disposition pour
    partager le même calcul, et le cas pivoté touche à un axe qui a déjà causé un bug de
    chevauchement par le passé (voir le commit d'origine de `rotate90` côté ZplLabelBuilder)."""
    width_dots = _mm_to_dots(fmt["width_mm"])
    height_dots = _mm_to_dots(fmt["height_mm"])
    top_offset = _mm_to_dots(fmt["top_offset_mm"])
    header = f"^XA^CI28^PW{width_dots}^LL{height_dots}"

    if not fmt["rotate90"]:
        # QR à gauche, titre + URL empilés à droite (texte non pivoté : empile normalement sur
        # Y). Dimensionné pour 57x32mm mais fonctionne pour toute étiquette assez large.
        text_x = 230
        text_width = width_dots - text_x - 10
        title_y = 20 + top_offset
        # Le titre le plus long ("Dashboard (tunnel)") tient sur 2 lignes à cette taille de
        # police, pas 1 — espace réservé pour 2 lignes dans tous les cas (les titres plus courts,
        # ex. "Public", laissent juste un peu de blanc en dessous) pour que l'URL commence
        # toujours au même endroit, quel que soit le titre.
        url_y = title_y + 70
        parts = [
            header,
            f"^FO16,{16 + top_offset}^BQN,2,5",
            f"^FDQA,{url}^FS",
            f"^FO{text_x},{title_y}^FB{text_width},2,4,L^A0N,30,30^FD{title}^FS",
            f"^FO{text_x},{url_y}^FB{text_width},4,2,L^A0N,20,20^FD{url}^FS",
            "^XZ",
        ]
        return "".join(parts).encode()

    # Format pivoté (ex. 36x89mm) : étiquette étroite (largeur = `^PW`, ex. 288 dots/36mm) mais
    # longue (hauteur = `^LL`, ex. 712 dots/89mm). `^FO` reste en coordonnées physiques dans les
    # deux cas — seule l'orientation du CONTENU change. Une première version tentait de séparer
    # QR et texte sur l'axe X (en pensant à tort que sous `^A0R` le texte "avance" sur Y comme un
    # champ ZplLabelBuilder stacké — voir sa note de calibration `rotate90`) : résultat en
    # chevauchement visible au rendu Labelary. Vu qu'on a 712 dots de long pour seulement ~190 de
    # QR, pas besoin d'être malin sur X : on empile juste QR puis texte le long de Y, avec une
    # marge large (qr_reserved) — overlap impossible par construction, peu importe l'ordre de
    # lecture une fois l'étiquette physiquement tournée (ça, ça reste à vérifier à l'impression).
    margin = 16
    qr_reserved = 220  # mag 5 : marge large, couvre une QR de version élevée (URL/domaine long)
    qr_y = margin + top_offset
    text_y = qr_y + qr_reserved
    text_advance_budget = max(1, height_dots - text_y - margin)
    parts = [
        header,
        f"^FO{margin},{qr_y}^BQN,2,5",
        f"^FDQA,{url}^FS",
        f"^FO{margin},{text_y}^FB{text_advance_budget},6,6,L^A0R,22,22^FD{title}  {url}^FS",
        "^XZ",
    ]
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
    def __init__(
        self,
        root: tk.Tk,
        backend,
        thermal_backend,
        events,
        autostart_module,
        get_executable_path: Callable[[], str],
    ):
        self.backend = backend
        self.thermal_backend = thermal_backend
        self.events = events
        self.autostart = autostart_module
        self.get_executable_path = get_executable_path
        self._quit_callback: Optional[Callable[[], None]] = None

        self._busy = False

        self.window = tk.Toplevel(root)
        self.window.title("Mise")
        self.window.geometry("820x620")
        self.window.resizable(False, False)
        self.window.withdraw()
        self.window.protocol("WM_DELETE_WINDOW", self.window.withdraw)

        self.status_label = ttk.Label(self.window, text="…", font=("TkDefaultFont", 12, "bold"))
        self.status_label.pack(anchor="w", padx=14, pady=(14, 6))

        # Un onglet par sujet plutôt que toutes les sections empilées sur deux colonnes — la
        # fenêtre devenait difficile à lire à force d'ajouter des sections. Journal, démarrage
        # automatique et Quitter restent en dessous, visibles quel que soit l'onglet.
        notebook = ttk.Notebook(self.window)
        notebook.pack(fill="x", padx=14)

        def add_tab(title: str) -> ttk.Frame:
            tab = ttk.Frame(notebook, padding=10)
            notebook.add(tab, text=title)
            return tab

        self._build_project_section(add_tab("Serveur et mises à jour"))

        # Cadre intérieur avec la même marge que les sections des autres onglets (padx=8 sur
        # chaque ligne), pour que les contenus soient alignés d'un onglet à l'autre.
        printer_tab = ttk.Frame(add_tab("Étiquettes"))
        printer_tab.pack(fill="x", padx=8, pady=(8, 0))
        if sys.platform == "win32":
            self._build_printer_picker(printer_tab)
            self._build_firewall_row(printer_tab)
        self._build_label_format_picker(printer_tab)

        printer_btn_row = ttk.Frame(printer_tab)
        printer_btn_row.pack(fill="x", pady=(0, 6))
        ttk.Button(printer_btn_row, text="Imprimer une étiquette de test", command=self._print_test).pack(
            side="left"
        )
        ttk.Button(printer_btn_row, text="Étiquette de mesure", command=self._print_ruler).pack(
            side="left", padx=(6, 0)
        )
        ttk.Button(printer_btn_row, text="Paramètres de base", command=self._reset_to_factory_defaults).pack(
            side="left", padx=(6, 0)
        )

        # Onglet séparé plutôt qu'une section de plus dans "Étiquettes" : deux imprimantes
        # indépendantes (deux ports du pont, voir bridge_server.py/main.py), chacune avec son
        # réglage/test propre — les mélanger dans le même onglet aurait rendu peu clair quel
        # bouton agit sur quelle imprimante.
        ticket_tab = ttk.Frame(add_tab("Ticket (cuisine)"))
        ticket_tab.pack(fill="x", padx=8, pady=(8, 0))
        ttk.Label(
            ticket_tab,
            text="Ticket thermique ESC/POS (ex. Epson TM-m30) pour imprimer les fiches "
            "techniques en cuisine — distinct de l'étiqueteuse Zebra ci-dessus.",
            wraplength=900,
            justify="left",
        ).pack(anchor="w", pady=(0, 10))
        self._build_ticket_mode_picker(ticket_tab)
        if sys.platform == "win32":
            self._build_ticket_printer_picker(ticket_tab)
            self._build_ticket_firewall_row(ticket_tab)
        self._build_ticket_network_fields(ticket_tab)
        self.ticket_status_label = ttk.Label(ticket_tab, text="…")
        self.ticket_status_label.pack(anchor="w", pady=(0, 6))
        ttk.Button(ticket_tab, text="Imprimer un ticket de test", command=self._print_ticket_test).pack(
            anchor="w"
        )

        zigbee_tab = add_tab("Pont Zigbee")
        # Le capteur Zigbee est toujours lié au mosquitto du serveur complet (voir
        # ensure_zigbee_connected dans main.py) — rien à proposer ici sur un poste public seul.
        # Évalué une fois à l'ouverture : changer de mode ensuite demande de rouvrir la fenêtre
        # (cas rare, le mode se choisit avant d'installer, voir _refresh_project).
        if (config.load().get("project_mode") or "server") != "public":
            self._build_zigbee_section(zigbee_tab)
        else:
            ttk.Label(
                zigbee_tab,
                text="Poste public : le capteur de température se branche sur le serveur "
                "complet, pas sur ce poste.",
                wraplength=900,
                justify="left",
            ).pack(anchor="w")

        self._build_connect_section(add_tab("QR codes de connexion"))
        self._build_kiosk_section(add_tab("Mode kiosque"))

        ttk.Label(self.window, text="Activité récente").pack(anchor="w", padx=14, pady=(10, 0))
        self.events_list = tk.Listbox(self.window, height=7)
        self.events_list.pack(fill="both", expand=True, padx=14, pady=(2, 8))

        self.autostart_var = tk.BooleanVar(value=self.autostart.is_enabled())
        ttk.Checkbutton(
            self.window,
            text="Lancer Mise au démarrage de l'ordinateur",
            variable=self.autostart_var,
            command=self._toggle_autostart,
        ).pack(anchor="w", padx=14, pady=(0, 8))

        btn_row = ttk.Frame(self.window)
        btn_row.pack(fill="x", padx=14, pady=(0, 14))
        ttk.Button(btn_row, text="Quitter", command=self._quit).pack(side="right")
        ttk.Button(btn_row, text="Recharger", command=self.refresh).pack(side="right", padx=(0, 6))

    def _build_printer_picker(self, parent: tk.Misc) -> None:
        from .print_backend_windows import WindowsPrintBackend

        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))
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

    def _build_firewall_row(self, parent: tk.Misc) -> None:
        # Le serveur (API) se connecte à CE poste pour imprimer — connexion entrante bloquée par
        # défaut par le pare-feu Windows, voir firewall_windows.py. Symptôme côté dashboard/public :
        # "Impossible de contacter l'imprimante à <ip> : Connection timed out".
        # Une seule ligne : la fenêtre a une hauteur fixe déjà presque pleine (voir `columns`).
        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))
        self.firewall_label = ttk.Label(frame, text="…")
        self.firewall_label.pack(side="left")
        self.firewall_button = ttk.Button(
            frame, text="Autoriser dans le pare-feu", command=self._allow_firewall
        )
        self.firewall_button.pack(side="right")

    def _refresh_firewall(self) -> None:
        if sys.platform != "win32":
            return
        if firewall_windows.is_bridge_port_allowed():
            self.firewall_label.config(text="Pare-feu : impression réseau autorisée ✓")
            self.firewall_button.config(state="disabled")
        else:
            self.firewall_label.config(text="⚠ Pare-feu : impression réseau non autorisée")
            self.firewall_button.config(state="disabled" if self._busy else "normal")

    def _allow_firewall(self) -> None:
        if self._busy:
            return
        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(firewall_windows.allow_bridge_port, ()),
            daemon=True,
        ).start()

    def _build_ticket_mode_picker(self, parent: tk.Misc) -> None:
        # USB : détection automatique par vendor ID sur macOS, imprimante Windows installée sur
        # Windows (voir _build_ticket_printer_picker) — comme la Zebra. Réseau : relaie vers une
        # IP/port directement, pour un Epson branché en Ethernet/WiFi plutôt qu'en USB (voir
        # NetworkPrintBackend/ThermalPrintBackend) — utile aussi bien sur macOS que sur Windows,
        # contrairement au reste de cet onglet qui dépend de l'OS.
        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))
        ttk.Label(frame, text="Connexion :").pack(anchor="w")

        cfg = config.load()
        self.ticket_mode_var = tk.StringVar(value=cfg.get("ticket_mode") or "usb")
        row = ttk.Frame(frame)
        row.pack(fill="x", pady=(2, 0))
        ttk.Radiobutton(
            row, text="USB (détection automatique / imprimante installée)",
            variable=self.ticket_mode_var, value="usb", command=self._save_ticket_mode,
        ).pack(side="left")
        ttk.Radiobutton(
            row, text="Réseau (IP)", variable=self.ticket_mode_var, value="network",
            command=self._save_ticket_mode,
        ).pack(side="left", padx=(12, 0))

    def _save_ticket_mode(self) -> None:
        cfg = config.load()
        cfg["ticket_mode"] = self.ticket_mode_var.get()
        config.save(cfg)
        self.refresh()

    def _build_ticket_network_fields(self, parent: tk.Misc) -> None:
        from .print_backend_network import DEFAULT_NETWORK_PORT

        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))
        ttk.Label(frame, text="Adresse réseau du ticket (mode « Réseau » ci-dessus) :").pack(anchor="w")

        cfg = config.load()
        row = ttk.Frame(frame)
        row.pack(fill="x", pady=(2, 0))

        self.ticket_host_var = tk.StringVar(value=cfg.get("ticket_network_host") or "")
        host_entry = ttk.Entry(row, textvariable=self.ticket_host_var)
        host_entry.pack(side="left", fill="x", expand=True)
        host_entry.bind("<FocusOut>", lambda _event: self._save_ticket_network())

        ttk.Label(row, text=":").pack(side="left", padx=(4, 4))

        self.ticket_port_var = tk.StringVar(value=str(cfg.get("ticket_network_port") or DEFAULT_NETWORK_PORT))
        port_entry = ttk.Entry(row, textvariable=self.ticket_port_var, width=6)
        port_entry.pack(side="left")
        port_entry.bind("<FocusOut>", lambda _event: self._save_ticket_network())

        ttk.Label(
            frame,
            text=f"Port par défaut des Epson réseau : {DEFAULT_NETWORK_PORT} — à ajuster si le "
            "modèle branché en utilise un autre.",
            wraplength=900,
            justify="left",
        ).pack(anchor="w", pady=(4, 0))

    def _save_ticket_network(self) -> None:
        from .print_backend_network import DEFAULT_NETWORK_PORT

        cfg = config.load()
        cfg["ticket_network_host"] = self.ticket_host_var.get().strip() or None
        try:
            cfg["ticket_network_port"] = int(self.ticket_port_var.get().strip())
        except ValueError:
            cfg["ticket_network_port"] = DEFAULT_NETWORK_PORT
            self.ticket_port_var.set(str(DEFAULT_NETWORK_PORT))
        config.save(cfg)
        self.refresh()

    def _build_ticket_printer_picker(self, parent: tk.Misc) -> None:
        from .print_backend_windows import WindowsPrintBackend

        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))
        ttk.Label(frame, text="Imprimante Windows (ticket) :").pack(anchor="w")

        cfg = config.load()
        self.ticket_printer_var = tk.StringVar(value=cfg.get("windows_ticket_printer_name") or "")
        try:
            printers = WindowsPrintBackend.list_printers()
        except Exception:  # noqa: BLE001 — liste best-effort, le champ reste utilisable à la main
            printers = []

        picker = ttk.Combobox(frame, textvariable=self.ticket_printer_var, values=printers)
        picker.pack(fill="x")
        picker.bind("<<ComboboxSelected>>", lambda _event: self._save_ticket_printer_name())
        picker.bind("<FocusOut>", lambda _event: self._save_ticket_printer_name())

    def _save_ticket_printer_name(self) -> None:
        cfg = config.load()
        cfg["windows_ticket_printer_name"] = self.ticket_printer_var.get().strip() or None
        config.save(cfg)

    def _build_ticket_firewall_row(self, parent: tk.Misc) -> None:
        # Même besoin que _build_firewall_row ci-dessus, pour le port du ticket (9101) plutôt que
        # celui des étiquettes (9100) — deux règles de pare-feu indépendantes, voir
        # firewall_windows.py.
        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))
        self.ticket_firewall_label = ttk.Label(frame, text="…")
        self.ticket_firewall_label.pack(side="left")
        self.ticket_firewall_button = ttk.Button(
            frame, text="Autoriser dans le pare-feu", command=self._allow_ticket_firewall
        )
        self.ticket_firewall_button.pack(side="right")

    def _refresh_ticket_firewall(self) -> None:
        if sys.platform != "win32":
            return
        if firewall_windows.is_thermal_bridge_port_allowed():
            self.ticket_firewall_label.config(text="Pare-feu : impression réseau autorisée ✓")
            self.ticket_firewall_button.config(state="disabled")
        else:
            self.ticket_firewall_label.config(text="⚠ Pare-feu : impression réseau non autorisée")
            self.ticket_firewall_button.config(state="disabled" if self._busy else "normal")

    def _allow_ticket_firewall(self) -> None:
        if self._busy:
            return
        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(firewall_windows.allow_thermal_bridge_port, ()),
            daemon=True,
        ).start()

    def _build_label_format_picker(self, parent: tk.Misc) -> None:
        # Format du rouleau actuellement chargé dans l'imprimante — pilote uniquement les
        # étiquettes générées ICI (test, QR, règle) ; indépendant du réglage du dashboard, qui
        # pilote les vraies étiquettes HACCP via sa propre config (voir _LABEL_FORMATS pour le
        # pourquoi de la duplication). À recaler ici si on change de rouleau sur l'imprimante.
        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))
        ttk.Label(frame, text="Format d'étiquette (rouleau chargé) :").pack(anchor="w")

        cfg = config.load()
        index = cfg.get("label_format_index", 0)
        if not isinstance(index, int) or not (0 <= index < len(_LABEL_FORMATS)):
            index = 0
        self.label_format_var = tk.StringVar(value=_LABEL_FORMATS[index]["label"])

        picker = ttk.Combobox(
            frame,
            textvariable=self.label_format_var,
            values=[fmt["label"] for fmt in _LABEL_FORMATS],
            state="readonly",
        )
        picker.pack(fill="x")
        picker.bind("<<ComboboxSelected>>", lambda _event: self._save_label_format())

    def _save_label_format(self) -> None:
        selected = self.label_format_var.get()
        index = next(
            (i for i, fmt in enumerate(_LABEL_FORMATS) if fmt["label"] == selected), 0
        )
        cfg = config.load()
        cfg["label_format_index"] = index
        config.save(cfg)

    def _build_project_section(self, parent: tk.Misc) -> None:
        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))

        # Choix fait une fois pour toutes avant d'installer (désactivé une fois cloné, voir
        # _refresh_project) : ce poste héberge-t-il toute la pile (db/api/dashboard/public/...),
        # ou juste mise-public, parlant à l'API d'un serveur complet déjà déployé ailleurs (voir
        # docker-compose.public.yml) ?
        mode_row = ttk.Frame(frame)
        mode_row.pack(fill="x", padx=8, pady=(8, 2))
        ttk.Label(mode_row, text="Mode :").pack(side="left")
        cfg = config.load()
        self.project_mode_var = tk.StringVar(value=cfg.get("project_mode") or "server")
        self.mode_server_radio = ttk.Radiobutton(
            mode_row, text="Serveur complet", variable=self.project_mode_var, value="server",
            command=self._save_project_mode,
        )
        self.mode_server_radio.pack(side="left", padx=(6, 0))
        self.mode_public_radio = ttk.Radiobutton(
            mode_row, text="Poste public", variable=self.project_mode_var, value="public",
            command=self._save_project_mode,
        )
        self.mode_public_radio.pack(side="left", padx=(6, 0))

        # Uniquement en mode poste public : adresse de l'API centrale, d'abord demandée à
        # l'installation (voir _install), modifiable ensuite ici si le serveur change d'adresse.
        # Construit une seule fois selon le mode choisi à l'ouverture de la fenêtre — comme pour
        # la section Zigbee (voir __init__), changer de mode ensuite demande de rouvrir la fenêtre.
        if self.project_mode_var.get() == "public":
            api_row = ttk.Frame(frame)
            api_row.pack(fill="x", padx=8, pady=(0, 2))
            ttk.Label(api_row, text="Adresse de l'API centrale (host:port) :").pack(anchor="w")
            repo_path = self._repo_path()
            current_api = (
                project.read_public_env_var(repo_path, "API_UPSTREAM")
                if project.is_repo_cloned(repo_path)
                else None
            )
            self.api_upstream_var = tk.StringVar(value=current_api or "")
            api_entry = ttk.Entry(api_row, textvariable=self.api_upstream_var)
            api_entry.pack(fill="x")
            api_entry.bind("<FocusOut>", lambda _event: self._save_api_upstream())

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

    def _project_mode(self) -> str:
        return config.load().get("project_mode") or "server"

    def _save_project_mode(self) -> None:
        cfg = config.load()
        cfg["project_mode"] = self.project_mode_var.get()
        config.save(cfg)
        self.refresh()

    def _save_api_upstream(self) -> None:
        if self._busy:
            return
        value = self.api_upstream_var.get().strip()
        if not value:
            return
        repo_path = self._repo_path()
        if not project.is_repo_cloned(repo_path):
            # Rien à modifier avant l'installation initiale — c'est _install() qui la demandera.
            return
        if value == project.read_public_env_var(repo_path, "API_UPSTREAM"):
            return  # Inchangé — pas de redémarrage Docker pour rien à chaque simple clic ailleurs.

        project.set_public_env_var(repo_path, "API_UPSTREAM", value, self.events.add)
        self.events.add("Adresse API mise à jour — redémarrage du poste public...")
        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(project.docker_up, (repo_path,), {"mode": "public"}),
            daemon=True,
        ).start()

    def _build_kiosk_section(self, parent: tk.Misc) -> None:
        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))

        ttk.Label(
            frame, text="Ouvre mise-public en plein écran, pour l'écran de la brigade en cuisine."
        ).pack(anchor="w", padx=8, pady=(8, 6))
        ttk.Label(frame, text="Adresse mise-public :").pack(anchor="w", padx=8, pady=(0, 2))
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

    def _build_connect_section(self, parent: tk.Misc) -> None:
        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))
        ttk.Label(
            frame,
            text="Imprime une étiquette avec un QR code vers l'app — pratique pour connecter un "
            "appareil (téléphone, tablette) sans retaper l'adresse.",
            wraplength=900,
            justify="left",
        ).pack(anchor="w", padx=8, pady=(8, 6))

        row = ttk.Frame(frame)
        row.pack(fill="x", padx=8, pady=(0, 8))
        row.columnconfigure((0, 1, 2), weight=1, uniform="qr_buttons")
        ttk.Button(row, text="Public", command=self._print_qr_public_lan).grid(
            row=0, column=0, sticky="ew"
        )
        ttk.Button(row, text="Dashboard (local)", command=self._print_qr_dashboard_lan).grid(
            row=0, column=1, sticky="ew", padx=6
        )
        ttk.Button(row, text="Dashboard (tunnel)", command=self._print_qr_dashboard_domain).grid(
            row=0, column=2, sticky="ew"
        )

    def _launch_kiosk(self) -> None:
        self._save_kiosk_url()
        url = self.kiosk_url_var.get().strip()
        try:
            kiosk.launch(url, self.events.add)
        except Exception as exc:  # noqa: BLE001 — affiché dans le journal, pas une exception à
            # laisser remonter jusqu'à l'UI.
            self.events.add(f"Échec du lancement du mode kiosque : {exc}", level="error")
        self.refresh()

    def _build_zigbee_section(self, parent: tk.Misc) -> None:
        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(0, 10))

        self.zigbee_status_label = ttk.Label(frame, text="…", wraplength=900, justify="left")
        self.zigbee_status_label.pack(anchor="w", padx=8, pady=(8, 4))

        picker_row = ttk.Frame(frame)
        picker_row.pack(fill="x", padx=8, pady=(0, 6))
        self.zigbee_device_var = tk.StringVar()
        self.zigbee_picker = ttk.Combobox(picker_row, textvariable=self.zigbee_device_var, state="readonly")
        self.zigbee_picker.pack(side="left", fill="x", expand=True)
        ttk.Button(picker_row, text="Détecter", command=self._detect_zigbee_devices).pack(
            side="left", padx=(6, 0)
        )
        self._zigbee_display_to_id: dict[str, str] = {}

        btn_row = ttk.Frame(frame)
        btn_row.pack(fill="x", padx=8, pady=(0, 8))
        if sys.platform == "darwin":
            # Sur Windows, rien à installer : usbipd-win est un prérequis système (voir
            # DEPLOY.md §10.A), pas quelque chose que mise-app peut cloner/compiler lui-même.
            self.zigbee_install_button = ttk.Button(btn_row, text="Installer", command=self._install_zigbee)
            self.zigbee_install_button.pack(side="left")
        self.zigbee_connect_button = ttk.Button(btn_row, text="Connecter", command=self._connect_zigbee)
        self.zigbee_connect_button.pack(side="left", padx=(6, 0) if sys.platform == "darwin" else 0)

    def _detect_zigbee_devices(self) -> None:
        try:
            candidates = zigbee_backend.list_candidate_devices()
        except project.CommandError as exc:
            self.events.add(f"Détection impossible : {exc}", level="error")
            install_command = getattr(exc, "install_command", None)
            if install_command and messagebox.askyesno(
                "Mise",
                f"{exc}\n\nCopier la commande d'installation dans le presse-papiers ?",
            ):
                self.window.clipboard_clear()
                self.window.clipboard_append(install_command)
                self.events.add(f"Commande copiée : {install_command}")
            return
        self._zigbee_display_to_id = {}
        displays = []
        for candidate in candidates:
            star = "★ " if candidate["likely"] else ""
            if sys.platform == "win32":
                label = f"{star}{candidate['busid']} — {candidate['device']} ({candidate['state']})"
                candidate_id = candidate["busid"]
            else:
                label = f"{star}{candidate['device']}"
                candidate_id = candidate["path"]
            displays.append(label)
            self._zigbee_display_to_id[label] = candidate_id

        self.zigbee_picker.config(values=displays)
        if displays:
            self.zigbee_device_var.set(displays[0])
        self.events.add(f"{len(displays)} périphérique(s) USB détecté(s).")

    def _install_zigbee(self) -> None:
        if self._busy:
            return
        self._activate()
        if not zigbee_backend.is_node_available():
            messagebox.showerror(
                "Mise",
                "Node.js n'est pas installé (ou pas dans le PATH) — nécessaire pour Zigbee2MQTT.\n\n"
                "Installer via Homebrew : brew install node",
            )
            return

        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(zigbee_backend.install, ()),
            daemon=True,
        ).start()

    def _connect_zigbee(self) -> None:
        if self._busy:
            return
        selected = self.zigbee_device_var.get()
        candidate_id = self._zigbee_display_to_id.get(selected)
        if not candidate_id:
            messagebox.showerror("Mise", "Choisir d'abord un périphérique (bouton « Détecter »).")
            return
        self._activate()

        cfg = config.load()
        if sys.platform == "win32":
            cfg["zigbee_busid"] = candidate_id
            args: tuple = (candidate_id, self._repo_path())
        else:
            cfg["zigbee_device_path"] = candidate_id
            args = (candidate_id,)
        config.save(cfg)

        self._busy = True
        self.refresh()
        threading.Thread(
            target=self._run_project_task,
            args=(zigbee_backend.connect, args),
            daemon=True,
        ).start()

    def _refresh_zigbee(self) -> None:
        if not hasattr(self, "zigbee_status_label"):
            # Section non construite (poste public seul, voir __init__) — rien à rafraîchir.
            return
        cfg = config.load()
        configured = cfg.get("zigbee_busid") if sys.platform == "win32" else cfg.get("zigbee_device_path")

        if not configured:
            self.zigbee_status_label.config(text="Aucun capteur connecté encore.")
        elif sys.platform == "darwin":
            running = "démarré" if zigbee_backend.is_running() else "arrêté"
            self.zigbee_status_label.config(text=f"Capteur : {configured} ({running})")
        else:
            self.zigbee_status_label.config(text=f"Capteur : {configured}")

        if sys.platform == "darwin":
            self.zigbee_install_button.config(
                state="disabled" if (self._busy or zigbee_backend.is_installed()) else "normal"
            )
        self.zigbee_connect_button.config(state="disabled" if self._busy else "normal")

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
        mode = self._project_mode()
        repo_path = self._repo_path()
        self.project_path_label.config(text=str(repo_path))

        cloned = project.is_repo_cloned(repo_path)
        # Mode figé une fois le dossier cloné (dans un sens ou dans l'autre) — changer d'avis
        # demande un nouveau dossier, pas la peine de gérer la bascule d'un mode à l'autre sur un
        # projet déjà installé.
        self.mode_server_radio.config(state="disabled" if cloned else "normal")
        self.mode_public_radio.config(state="disabled" if cloned else "normal")

        # Écrit par main.py::maybe_check_for_updates (une fois par jour, en tâche de fond) — lu
        # ici, jamais recalculé depuis l'UI, pour ne jamais faire d'appel réseau à chaque
        # rafraîchissement (3s).
        update_available = config.load().get("update_available") if cloned else None
        if cloned:
            version = project.current_version(repo_path)
            status_text = f"✅ Installé — version {version}"
            if update_available:
                status_text += f"  ·  🆕 {update_available} disponible"
            self.project_status_label.config(text=status_text)
        else:
            self.project_status_label.config(text="⬜ Pas encore installé dans ce dossier")

        self.update_button.config(
            text=f"Mettre à jour → {update_available}" if update_available else "Mettre à jour"
        )

        self.install_button.config(state="disabled" if (self._busy or cloned) else "normal")
        self.update_button.config(state="normal" if (not self._busy and cloned) else "disabled")
        # Pas de base locale à sauvegarder/restaurer sur un poste public seul (voir
        # docker-compose.public.yml, qui n'a ni `db` ni `db-backup`).
        can_backup = not self._busy and cloned and mode == "server"
        self.backup_button.config(state="normal" if can_backup else "disabled")
        self.restore_button.config(state="normal" if can_backup else "disabled")

        if not cloned:
            self.server_status_label.config(text="")
            self.start_server_button.config(state="disabled")
            self.stop_server_button.config(state="disabled")
            return

        status = project.server_status(repo_path, mode) if project.is_docker_available() else "unknown"
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

        mode = self._project_mode()
        if mode == "public":
            api_upstream = _ask_string(
                self.window,
                "Mise",
                "Adresse de l'API du serveur Mise central, joignable depuis ce poste "
                "(host:port — ex. 192.168.1.10:8000, voir .env.public.example) :",
            )
            if not api_upstream:
                return

            self._busy = True
            self.refresh()
            threading.Thread(
                target=self._run_project_task,
                args=(project.install_public, (repo_path, api_upstream), {"github_token": github_token}),
                daemon=True,
            ).start()
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

        # Optimiste : on vise justement cette version-là. Si la mise à jour échoue en route, la
        # prochaine vérification quotidienne (ou un redémarrage de l'app) la re-détectera de toute
        # façon — pas la peine d'attendre la confirmation pour arrêter d'afficher un badge "1.3.0
        # disponible" pendant qu'on est justement en train de l'installer.
        cfg = config.load()
        cfg["update_available"] = None
        config.save(cfg)

        self._busy = True
        self.refresh()
        update_fn = project.update_public if self._project_mode() == "public" else project.update
        threading.Thread(
            target=self._run_project_task,
            args=(update_fn, (repo_path,)),
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
            args=(project.start_server, (repo_path,), {"mode": self._project_mode()}),
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
            args=(project.stop_server, (repo_path,), {"mode": self._project_mode()}),
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

        ticket_available = self.thermal_backend.is_available()
        ticket_prefix = "🟢" if ticket_available else "🟠"
        self.ticket_status_label.config(text=f"{ticket_prefix} {self.thermal_backend.describe()}")

        self._refresh_project()
        self._refresh_zigbee()
        self._refresh_firewall()
        self._refresh_ticket_firewall()

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
            self.backend.send(_test_zpl(_current_label_format()))
            self.events.add("Étiquette de test envoyée")
        except Exception as exc:  # noqa: BLE001 — affiché dans le journal, pas une exception à
            # laisser remonter jusqu'à l'UI.
            self.events.add(f"Échec du test : {exc}", level="error")
        self.refresh()

    def _print_ticket_test(self) -> None:
        try:
            self.thermal_backend.send(_test_escpos())
            self.events.add("Ticket de test envoyé")
        except Exception as exc:  # noqa: BLE001 — voir _print_test
            self.events.add(f"Échec du test : {exc}", level="error")
        self.refresh()

    def _reset_to_factory_defaults(self) -> None:
        """Remet l'imprimante sur les réglages d'usine Zebra (noirceur, vitesse, type de support...,
        voir _FACTORY_DEFAULTS_ZPL) — utile si quelqu'un a modifié ces réglages à la main (panneau
        imprimante, ancien pilote...) et que l'impression dérive. Le format d'étiquette (dashboard)
        n'est pas affecté."""
        confirmed = messagebox.askyesno(
            "Mise",
            "Remettre l'imprimante sur ses réglages d'usine (noirceur, vitesse, type de "
            "support) ?\n\nLe format d'étiquette configuré dans le dashboard n'est pas touché.",
            icon="warning",
        )
        if not confirmed:
            return
        try:
            self.backend.send(_FACTORY_DEFAULTS_ZPL)
            self.events.add("Réglages d'usine restaurés")
        except Exception as exc:  # noqa: BLE001 — voir _print_test
            self.events.add(f"Échec de la restauration des réglages d'usine : {exc}", level="error")
        self.refresh()

    def _print_ruler(self) -> None:
        """Imprime une étiquette graduée pour mesurer à l'œil la zone morte mécanique en haut de
        l'impression (voir _ruler_zpl) — le chiffre lu en premier visible, en dots, est la valeur à
        reporter dans `label_top_offset_mm` côté dashboard (÷ 7,99 pour du 203dpi → mm)."""
        fmt = _current_label_format()
        try:
            self.backend.send(_ruler_zpl(_mm_to_dots(fmt["width_mm"]), _mm_to_dots(fmt["height_mm"])))
            self.events.add("Étiquette de mesure envoyée — relève le premier chiffre visible en haut")
        except Exception as exc:  # noqa: BLE001 — voir _print_test
            self.events.add(f"Échec de l'impression de mesure : {exc}", level="error")
        self.refresh()

    def _print_qr_public_lan(self) -> None:
        url = f"http://{network.local_ip()}:{_PUBLIC_PORT}"
        self._print_connection_qr(url, "Public")

    def _print_qr_dashboard_lan(self) -> None:
        # Contrairement à "Public" ci-dessus (qui tourne sur CE poste dans les deux modes), le
        # dashboard ne tourne jamais sur un poste public — il faut pointer vers le serveur central
        # (voir _central_api_host), pas vers l'IP de cette machine.
        if self._project_mode() == "public":
            host = self._central_api_host()
            if not host:
                messagebox.showerror(
                    "Mise",
                    "Adresse de l'API centrale inconnue — renseigne-la dans la section Projet "
                    "(champ sous le choix de mode) avant d'imprimer ce QR code.",
                )
                return
        else:
            host = network.local_ip()
        url = f"http://{host}:{_DASHBOARD_PORT}"
        self._print_connection_qr(url, "Dashboard (local)")

    def _central_api_host(self) -> Optional[str]:
        """Hôte (sans port) du serveur central déduit d'API_UPSTREAM dans .env.public — None si
        pas encore installé/renseigné."""
        repo_path = self._repo_path()
        if not project.is_repo_cloned(repo_path):
            return None
        api_upstream = project.read_public_env_var(repo_path, "API_UPSTREAM")
        return api_upstream.split(":")[0] if api_upstream else None

    def _print_qr_dashboard_domain(self) -> None:
        repo_path = self._repo_path()
        domain_url = (
            project.read_env_var(repo_path, "CLOUDFLARE_DASHBOARD_URL")
            if project.is_repo_cloned(repo_path)
            else None
        )
        if not domain_url:
            messagebox.showerror(
                "Mise",
                "Aucune adresse de domaine configurée.\n\n"
                "Renseignez CLOUDFLARE_DASHBOARD_URL dans le .env du projet (ex. "
                "https://dashboard.mise-vidal.be) après avoir suivi DEPLOY.md §4 « Tunnel "
                "nommé », puis réessayez.",
            )
            return
        self._print_connection_qr(domain_url, "Dashboard (tunnel)")

    def _print_connection_qr(self, url: str, title: str) -> None:
        try:
            self.backend.send(_qr_zpl(url, title, _current_label_format()))
            self.events.add(f"QR code de connexion envoyé — {title} : {url}")
        except Exception as exc:  # noqa: BLE001 — voir _print_test
            self.events.add(f"Échec de l'impression du QR : {exc}", level="error")
        self.refresh()

    def _quit(self) -> None:
        if self._quit_callback:
            self._quit_callback()
