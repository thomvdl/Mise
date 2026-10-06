"""Icône de barre système (barre de menus macOS / barre des tâches Windows), via `pystray`. La
couleur est générée à la volée avec PIL — pas de fichier image externe à maintenir — et reflète
l'état détecté (voir print_backend_macos.py::is_available() / print_backend_windows.py::is_available()).
"""

import pystray
from PIL import Image, ImageDraw

_SIZE = 64


def make_icon_image(color: str) -> Image.Image:
    img = Image.new("RGBA", (_SIZE, _SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = 6
    draw.ellipse((margin, margin, _SIZE - margin, _SIZE - margin), fill=color, outline="white", width=2)
    return img


def build_tray_icon(open_status_window, quit_app) -> pystray.Icon:
    menu = pystray.Menu(
        pystray.MenuItem("Ouvrir", open_status_window, default=True),
        pystray.MenuItem("Quitter", quit_app),
    )
    return pystray.Icon("mise-zpl-bridge", make_icon_image("orange"), "Mise", menu)


def update_icon(icon: pystray.Icon, available: bool) -> None:
    icon.icon = make_icon_image("#3DAA5C" if available else "#D98C2B")
