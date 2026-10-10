"""Vérifie périodiquement GET /api/temperature-alerts/active (voir
mise-api/app/Http/Controllers/TemperatureAlertController.php) et déclenche une notification de
bureau (popup + son) si un appareil équipé d'un capteur Zigbee dépasse sa plage de température.

Jamais plus d'une notification par appareil et par _REMINDER_COOLDOWN_S : un appareil réellement
en panne reste hors plage pendant des heures, et une notification chaque minute toute la nuit
rendrait la fonctionnalité inutilisable (ignorée/désactivée) plutôt qu'utile.
"""

import json
import sys
import time
import urllib.error
import urllib.request

from . import config

_CHECK_INTERVAL_S = 60
_REMINDER_COOLDOWN_S = 30 * 60


def _api_base_url() -> str:
    return config.load().get("api_url") or "http://localhost:8000"


def _fetch_active_alerts() -> list[dict]:
    url = f"{_api_base_url()}/api/temperature-alerts/active"
    with urllib.request.urlopen(url, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def _play_alert_sound() -> None:
    if sys.platform == "win32":
        import winsound

        winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)


def check_once(icon, events) -> None:
    """Appelée à chaque tick (voir main.py) — ne fait rien si le dernier essai date de moins de
    _CHECK_INTERVAL_S. Même pattern que main.maybe_check_for_updates (horodatage dans config.json,
    pas de minuteur en mémoire séparé)."""
    cfg = config.load()
    last_checked = cfg.get("last_temperature_check_at")
    if isinstance(last_checked, (int, float)) and (time.time() - last_checked) < _CHECK_INTERVAL_S:
        return

    cfg["last_temperature_check_at"] = time.time()
    config.save(cfg)

    try:
        alerts = _fetch_active_alerts()
    except (urllib.error.URLError, OSError, ValueError):
        # Silencieux plutôt qu'une erreur dans le journal : l'API est injoignable à chaque
        # redémarrage du mini PC pendant que Docker démarre, ce n'est pas une anomalie.
        return

    cfg = config.load()
    notified_at: dict = cfg.get("temperature_alert_notified_at", {})
    now = time.time()
    active_ids = set()

    for alert in alerts:
        appareil_id = str(alert["appareil_id"])
        active_ids.add(appareil_id)

        last_notified = notified_at.get(appareil_id)
        if isinstance(last_notified, (int, float)) and (now - last_notified) < _REMINDER_COOLDOWN_S:
            continue

        message = (
            f"{alert['name']} : {alert['temperature']}°C "
            f"(plage {alert['temperature_min']}–{alert['temperature_max']}°C)"
        )
        if icon.HAS_NOTIFICATION:
            icon.notify(message, "Température hors plage")
        _play_alert_sound()
        events.add(f"Alerte température — {message}", level="error")
        notified_at[appareil_id] = now

    # Un appareil revenu dans sa plage oublie son cooldown, pour re-notifier tout de suite s'il en
    # ressort à nouveau plus tard plutôt que d'attendre la fin du cooldown précédent.
    for appareil_id in list(notified_at):
        if appareil_id not in active_ids:
            del notified_at[appareil_id]

    cfg["temperature_alert_notified_at"] = notified_at
    config.save(cfg)
