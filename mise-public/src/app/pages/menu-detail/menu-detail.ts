import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { MenuService } from '../../core/services/menu.service';
import { Menu } from '../../core/models/menu.model';
import { MenuTree } from '../../components/menu-tree/menu-tree';

/**
 * Vue détail seule d'un menu — la sélection se fait via le tableau `/menus`, cette page affiche
 * le menu pointé par `?id=` (lien depuis le tableau, le calendrier, ou tout autre appelant).
 * `?print=1` déclenche l'impression automatiquement une fois le menu chargé — raccourci "Imprimer
 * le menu" du tableau, pour éviter un clic de plus une fois sur la page.
 */
@Component({
  selector: 'app-menu-detail',
  imports: [MenuTree, RouterLink],
  templateUrl: './menu-detail.html',
  styleUrl: './menu-detail.css',
})
export class MenuDetail {
  private readonly menuService = inject(MenuService);
  private readonly route = inject(ActivatedRoute);

  private readonly rawMenu = signal<Menu | null>(null);
  menu = this.rawMenu.asReadonly();

  private readonly queryParamId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  private readonly shouldPrint = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('print') === '1')),
    { initialValue: false },
  );

  private printed = false;

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

    effect(() => {
      if (this.menu() && this.shouldPrint() && !this.printed) {
        this.printed = true;
        setTimeout(() => window.print(), 200);
      }
    });
  }
}
