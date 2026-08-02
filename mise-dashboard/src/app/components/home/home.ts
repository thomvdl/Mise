import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

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
      description: "Historique d'impression des étiquettes (traçabilité HACCP).",
      path: '/etiquettes',
      icon: 'report',
    },
    {
      label: 'Discussion',
      description: 'Échanger avec la brigade.',
      path: '/discussion',
      icon: 'message',
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
