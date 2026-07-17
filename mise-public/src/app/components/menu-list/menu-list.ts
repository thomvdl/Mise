import { Component, input, output } from '@angular/core';

import { Menu } from '../../core/models/menu.model';

@Component({
  selector: 'app-menu-list',
  imports: [],
  templateUrl: './menu-list.html',
  styleUrl: './menu-list.css',
})
export class MenuList {
  menus = input<Menu[]>([]);
  selectedId = input<number | null>(null);
  select = output<number>();

  platCount(menu: Menu): number {
    return (menu.sections ?? []).reduce((sum, section) => sum + (section.plats?.length ?? 0), 0);
  }

  dateLabel(menu: Menu): string | null {
    if (!menu.starts_at) return null;
    if (menu.ends_at === menu.starts_at) return menu.starts_at;
    if (!menu.ends_at) return `À partir du ${menu.starts_at}`;
    return `${menu.starts_at} → ${menu.ends_at}`;
  }
}
