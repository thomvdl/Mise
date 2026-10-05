import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import QRCode from 'qrcode';

import { AuthService } from '../../core/services/auth.service';

const CONNECT_URL_STORAGE_KEY = 'mise-public-connect-url';

interface HomeTile {
  label: string;
  description: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-accueil',
  imports: [RouterLink],
  templateUrl: './accueil.html',
  styleUrl: './accueil.css',
})
export class Accueil {
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
   * Adresse à encoder dans le QR. Part de l'origine courante, mais reste éditable : pour un
   * accès depuis l'extérieur du réseau, on y colle plutôt l'URL du tunnel Cloudflare (voir le
   * conteneur cloudflared-public — même principe que côté dashboard). Mémorisée en localStorage.
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
      description: 'Consulter les recettes par poste, ingrédients et allergènes.',
      path: '/fiches',
      icon: 'book',
    },
    {
      label: 'Menus',
      description: 'Voir les menus en cours et les plats qui les composent.',
      path: '/menus',
      icon: 'list',
    },
    {
      label: 'Impression étiquettes',
      description: "Éditer et imprimer les étiquettes de traçabilité HACCP.",
      path: '/etiquettes',
      icon: 'tag',
    },
    {
      label: 'Ingrédients',
      description: 'Rechercher un ingrédient, son prix et ses allergènes.',
      path: '/ingredients',
      icon: 'leaf',
    },
    {
      label: 'Températures',
      description: 'Saisir les relevés de température des appareils.',
      path: '/temperatures',
      icon: 'thermometer',
    },
    {
      label: 'Huile',
      description: "Suivre le changement d'huile des friteuses.",
      path: '/huile',
      icon: 'droplet',
    },
    {
      label: 'Mise en place',
      description: 'Todo par station, groupe ou événement avant le service.',
      path: '/mise-en-place',
      icon: 'check',
    },
    {
      label: 'Liste de courses',
      description: 'Ajouter et suivre les articles à commander.',
      path: '/courses',
      icon: 'cart',
    },
    {
      label: 'Calendrier',
      description: "Retrouver les échéances et événements de l'équipe.",
      path: '/calendrier',
      icon: 'calendar',
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
  ];
}
