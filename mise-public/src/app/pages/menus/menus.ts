import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { MenuService } from '../../core/services/menu.service';
import { MenuList } from '../../components/menu-list/menu-list';
import { MenuTree } from '../../components/menu-tree/menu-tree';

@Component({
  selector: 'app-menus',
  imports: [MenuList, MenuTree],
  templateUrl: './menus.html',
  styleUrl: './menus.css',
})
export class Menus {
  private readonly menuService = inject(MenuService);
  private readonly route = inject(ActivatedRoute);

  menus = toSignal(this.menuService.list(), { initialValue: [] });

  /** Pre-selects the menu linked from another page (e.g. the calendar's "Voir le menu" button). */
  private readonly queryMenuId = (() => {
    const raw = this.route.snapshot.queryParamMap.get('menu');
    return raw ? Number(raw) : null;
  })();

  selectedId = signal<number | null>(this.queryMenuId);

  /** Most recently created menu first. */
  sortedMenus = computed(() =>
    [...this.menus()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  );

  selectedMenu = computed(() => this.sortedMenus().find((menu) => menu.id === this.selectedId()) ?? null);

  constructor() {
    effect(() => {
      const list = this.sortedMenus();
      if (this.selectedId() === null && list.length > 0) {
        this.selectedId.set(list[0].id);
      }
    });
  }
}
