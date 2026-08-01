import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private readonly auth = inject(AuthService);

  /** Below the breakpoint where nav-links no longer fit, they collapse into this dropdown. */
  menuOpen = signal(false);

  currentUser = this.auth.user;

  readonly navLinks: NavLink[] = [
    { label: 'Menus', path: '/menus' },
    { label: 'Fiches techniques', path: '/fiche-techniques' },
    { label: 'Ingrédients', path: '/ingredients' },
    { label: 'Photos', path: '/photos' },
    { label: 'Discussion', path: '/discussion' },
    { label: 'Liste de courses', path: '/courses' },
    { label: 'Calendrier', path: '/calendrier' },
    { label: 'Températures', path: '/temperatures' },
    { label: 'Huile', path: '/huile' },
    { label: 'Étiquettes', path: '/etiquettes' },
    { label: 'Utilisateurs', path: '/utilisateurs' },
  ];

  /** Regroupées à part car peu consultées au quotidien — accessible tout en bas du menu. */
  readonly settingsLink: NavLink = { label: 'Paramètres', path: '/parametres' };

  logout(): void {
    this.auth.logout();
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggle() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    const icon = document.getElementById('knobIcon');

    if (icon) {
      icon.innerHTML = next === 'dark'
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  }
}
