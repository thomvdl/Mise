import { Injectable, effect, inject } from '@angular/core';

import { AuthService } from './auth.service';

const INACTIVITY_LIMIT_MS = 180_000;
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'] as const;

/** Déconnecte automatiquement après trois minutes sans interaction — pensé pour un écran partagé en
 * cuisine (potentiellement en kiosque plein écran, voir mise-app) où personne ne pense à se
 * déconnecter manuellement entre deux utilisateurs.
 *
 * `providedIn: 'root'` instancie ce service une seule fois, au premier `inject()` (voir App) — ce
 * constructeur fait tout le travail, pas besoin d'une méthode `start()` séparée. */
@Injectable({ providedIn: 'root' })
export class InactivityLogoutService {
  private readonly auth = inject(AuthService);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    for (const eventName of ACTIVITY_EVENTS) {
      document.addEventListener(eventName, () => this.resetTimer(), { passive: true });
    }

    // Réagit aussi directement à la connexion/déconnexion elle-même, pas seulement aux
    // interactions qui suivent : sans ça, une session tout juste ouverte puis abandonnée aussitôt
    // (précisément le cas qu'on veut couvrir) ne déclenchait jamais le tout premier timer, la
    // connexion réussie n'étant pas elle-même un des événements DOM écoutés ci-dessus.
    effect(() => {
      this.auth.user();
      this.resetTimer();
    });
  }

  private resetTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // Rien à surveiller tant que personne n'est connecté — la page de connexion elle-même ne
    // doit jamais se "déconnecter".
    if (!this.auth.user()) return;

    this.timer = setTimeout(() => this.auth.logout(), INACTIVITY_LIMIT_MS);
  }
}
