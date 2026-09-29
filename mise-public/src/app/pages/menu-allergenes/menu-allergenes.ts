import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { MenuService } from '../../core/services/menu.service';
import { Menu } from '../../core/models/menu.model';
import { MenuAllergenGrid } from '../../components/menu-allergen-grid/menu-allergen-grid';

/** Grille allergènes seule pour un menu — pointée par `?id=` depuis le tableau `/menus`. */
@Component({
  selector: 'app-menu-allergenes',
  imports: [MenuAllergenGrid, RouterLink],
  templateUrl: './menu-allergenes.html',
  styleUrl: './menu-allergenes.css',
})
export class MenuAllergenesPage {
  private readonly menuService = inject(MenuService);
  private readonly route = inject(ActivatedRoute);

  private readonly rawMenu = signal<Menu | null>(null);
  menu = this.rawMenu.asReadonly();

  private readonly queryParamId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  constructor() {
    effect(() => {
      const idParam = this.queryParamId();
      const id = idParam !== null ? Number(idParam) : NaN;

      if (Number.isNaN(id)) {
        this.rawMenu.set(null);
        return;
      }

      this.menuService.get(id).subscribe({
        next: (menu) => this.rawMenu.set(menu),
        error: () => this.rawMenu.set(null),
      });
    });
  }
}
