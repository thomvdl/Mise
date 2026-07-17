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
  ];
}
