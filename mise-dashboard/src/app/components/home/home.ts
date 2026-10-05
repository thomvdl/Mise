import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import QRCode from 'qrcode';

import { AuthService } from '../../core/services/auth.service';

const CONNECT_URL_STORAGE_KEY = 'mise-dashboard-connect-url';

interface HomeTile {
  label: string;
  description: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly auth = inject(AuthService);

  currentUser = this.auth.user;

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Bon courage';
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  });

  /**
   * Adresse à encoder dans le QR. `window.location.origin` ne convient que si le dashboard a été
   * ouvert via l'IP réseau de la machine — si on y est via `localhost` (le cas le plus courant
   * sur la machine qui héberge le dashboard elle-même), le QR pointerait un téléphone vers son
   * propre localhost, pas vers ce PC. On part donc de l'origine courante, mais ça reste
   * éditable : l'admin tape une fois l'IP réseau réelle du PC (ex. 192.168.1.23:8081), et elle
   * est mémorisée (localStorage) pour les prochaines fois.
   */
  connectionUrl = signal(this.loadSavedUrl() ?? window.location.origin);
  showConnect = signal(false);
  qrDataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const url = this.connectionUrl();
      if (!this.showConnect() || !url) return;

      QRCode.toDataURL(url, { width: 180, margin: 1 })
        .then((dataUrl) => this.qrDataUrl.set(dataUrl))
        .catch(() => this.qrDataUrl.set(null));
    });
  }

  toggleConnect(): void {
    this.showConnect.update((shown) => !shown);
  }

  onUrlInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.connectionUrl.set(value);
    try {
      localStorage.setItem(CONNECT_URL_STORAGE_KEY, value);
    } catch {
      // Stockage indisponible (navigation privée, site data bloqué…) — tant pis, l'URL reste
      // utilisable pour cette session, juste pas mémorisée pour la prochaine.
    }
  }

  private loadSavedUrl(): string | null {
    try {
      return localStorage.getItem(CONNECT_URL_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  readonly tiles: HomeTile[] = [
    {
      label: 'Fiches techniques',
      description: 'Créer et modifier les fiches de production.',
      path: '/fiche-techniques',
      icon: 'book',
    },
    {
      label: 'Menus',
      description: 'Composer les menus à partir des fiches techniques.',
      path: '/menus',
      icon: 'list',
    },
    {
      label: 'Ingrédients',
      description: 'Gérer les ingrédients, prix et allergènes.',
      path: '/ingredients',
      icon: 'leaf',
    },
    {
      label: 'Photos',
      description: 'Photos rattachées aux fiches et ingrédients.',
      path: '/photos',
      icon: 'image',
    },
    {
      label: 'Températures',
      description: 'Courbes et rapports des relevés de température.',
      path: '/temperatures',
      icon: 'thermometer',
    },
    {
      label: 'Huile',
      description: "Rapport des changements d'huile par friteuse.",
      path: '/huile',
      icon: 'report',
    },
    {
      label: 'Étiquettes',
      description: "Composer et imprimer des étiquettes, ou piocher dans une liste enregistrée.",
      path: '/etiquettes',
      icon: 'report',
    },
    {
      label: 'Historique des étiquettes',
      description: "Historique d'impression des étiquettes (traçabilité HACCP).",
      path: '/etiquettes/historique',
      icon: 'report',
    },
    {
      label: 'Discussion',
      description: 'Échanger avec la brigade.',
      path: '/discussion',
      icon: 'message',
    },
    {
      label: 'Notes',
      description: 'Pages et sous-pages libres en markdown.',
      path: '/notes',
      icon: 'edit',
    },
    {
      label: 'Mise en place',
      description: 'Todo par station, groupe ou événement avant le service.',
      path: '/mise-en-place',
      icon: 'check',
    },
    {
      label: 'Liste de courses',
      description: 'Suivre les articles à commander.',
      path: '/courses',
      icon: 'cart',
    },
    {
      label: 'Calendrier',
      description: "Échéances et événements de l'équipe.",
      path: '/calendrier',
      icon: 'calendar',
    },
    {
      label: 'Utilisateurs',
      description: 'Gérer les comptes de la brigade.',
      path: '/utilisateurs',
      icon: 'user',
    },
    {
      label: 'Paramètres',
      description: 'Catégories, stations, allergènes…',
      path: '/parametres',
      icon: 'settings',
    },
  ];
}
