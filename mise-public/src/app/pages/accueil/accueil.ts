import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { AccueilDashboard } from '../../components/accueil-dashboard/accueil-dashboard';

type AccueilView = 'tiles' | 'dashboard';

/** Dernière vue choisie sur l'accueil, retenue par appareil (tablette de cuisine, poste...). */
const ACCUEIL_VIEW_KEY = 'mise_accueil_view';

function readStoredView(): AccueilView {
  try {
    return localStorage.getItem(ACCUEIL_VIEW_KEY) === 'dashboard' ? 'dashboard' : 'tiles';
  } catch {
    return 'tiles';
  }
}

interface HomeTile {
  label: string;
  description: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-accueil',
  imports: [RouterLink, AccueilDashboard],
  templateUrl: './accueil.html',
  styleUrl: './accueil.css',
})
export class Accueil {
  private readonly auth = inject(AuthService);

  currentUser = this.auth.user;

  view = signal<AccueilView>(readStoredView());

  setView(view: AccueilView) {
    this.view.set(view);
    try {
      localStorage.setItem(ACCUEIL_VIEW_KEY, view);
    } catch {
      // Stockage indisponible (navigation privée…) : le choix ne vaut que pour cette visite.
    }
  }

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Bon courage';
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  });

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
