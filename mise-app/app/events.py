"""Petit historique en mémoire des derniers événements du pont (impressions, erreurs) — affiché
dans la fenêtre de statut (voir status_window.py). Volontairement non persistant : juste de quoi
voir ce qui vient de se passer, pas un journal d'audit (pour ça, voir l'historique des étiquettes
côté MISE, qui lui est en base de données)."""

import collections
import datetime
import threading


class EventLog:
    def __init__(self, max_entries: int = 20):
        self._lock = threading.Lock()
        self._entries = collections.deque(maxlen=max_entries)

    def add(self, message: str, level: str = "info") -> None:
        with self._lock:
            self._entries.appendleft((datetime.datetime.now(), level, message))

    def recent(self) -> list[tuple[datetime.datetime, str, str]]:
        with self._lock:
            return list(self._entries)
