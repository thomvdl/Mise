import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { LocalPrinterService } from '../../core/services/local-printer.service';
import { Printer } from '../../core/models/printer.model';
import { PrinterService } from '../../core/services/printer.service';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly printerService = inject(PrinterService);
  readonly localPrinter = inject(LocalPrinterService);

  currentUser = this.auth.user;

  /** Pour le sélecteur "imprimante de ce poste" — vide tant qu'aucune imprimante n'est configurée,
   *  auquel cas le sélecteur ne s'affiche pas du tout (rien à choisir). */
  printers = signal<Printer[]>([]);
  labelPrinters = computed(() => this.printers().filter((p) => p.type === 'label'));
  thermalPrinters = computed(() => this.printers().filter((p) => p.type === 'thermal'));

  /** Below the breakpoint where nav-links no longer fit, they collapse into this dropdown. */
  menuOpen = signal(false);

  readonly navLinks: NavLink[] = [
    { label: 'Menus', path: '/menus' },
    { label: 'Fiches techniques', path: '/fiches' },
    { label: 'Ingrédients', path: '/ingredients' },
    { label: 'Impression', path: '/etiquettes' },
    { label: 'Discussion', path: '/discussion' },
    { label: 'Notes', path: '/notes' },
    { label: 'Mise en place', path: '/mise-en-place' },
    { label: 'Liste de courses', path: '/courses' },
    { label: 'Calendrier', path: '/calendrier' },
    { label: 'Températures', path: '/temperatures' },
    { label: 'Huile', path: '/huile' },
  ];

  /** Reflects `navigator.onLine` so the crew knows they're looking at cached data, not live. */
  isOffline = signal(typeof navigator !== 'undefined' && !navigator.onLine);

  constructor() {
    if (typeof window === 'undefined') return;

    const goOnline = () => this.isOffline.set(false);
    const goOffline = () => this.isOffline.set(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    });
  }

  ngOnInit(): void {
    this.printerService.list().subscribe({ next: (printers) => this.printers.set(printers) });
  }

  selectLocalPrinter(value: string): void {
    this.localPrinter.set(value === '' ? null : Number(value));
  }

  selectLocalThermalPrinter(value: string): void {
    this.localPrinter.setThermal(value === '' ? null : Number(value));
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
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
