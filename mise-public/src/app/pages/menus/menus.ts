import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { MenuService } from '../../core/services/menu.service';
import { Menu } from '../../core/models/menu.model';

/**
 * Tableau des menus — consultation seule (recherche par nom), sur le même modèle que le tableau
 * des fiches techniques (`/fiches`). La sélection d'un menu ne se fait plus dans une barre
 * latérale : chaque ligne pointe vers la vue détail (`/menus/recherche?id=`) ou la grille
 * allergènes (`/menus/allergenes?id=`) via `?id=`.
 */
@Component({
  selector: 'app-menus',
  imports: [RouterLink],
  templateUrl: './menus.html',
  styleUrl: './menus.css',
})
export class Menus {
  private readonly menuService = inject(MenuService);

  menus = toSignal(this.menuService.list(), { initialValue: [] as Menu[] });

  search = signal('');

  filteredMenus = computed(() => {
    const query = this.search().trim().toLowerCase();

    return this.menus()
      .filter((menu) => !query || menu.name.toLowerCase().includes(query))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  totalCount = computed(() => this.filteredMenus().length);

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  dateLabel(menu: Menu): string | null {
    if (!menu.starts_at) return null;
    if (menu.ends_at === menu.starts_at) return menu.starts_at;
    if (!menu.ends_at) return `À partir du ${menu.starts_at}`;
    return `${menu.starts_at} → ${menu.ends_at}`;
  }

  sectionCount(menu: Menu): number {
    return (menu.sections ?? []).length;
  }

  platCount(menu: Menu): number {
    return (menu.sections ?? []).reduce((sum, section) => sum + (section.plats?.length ?? 0), 0);
  }
}
