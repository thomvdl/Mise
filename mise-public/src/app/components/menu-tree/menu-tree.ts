import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Menu } from '../../core/models/menu.model';

@Component({
  selector: 'app-menu-tree',
  imports: [RouterLink],
  templateUrl: './menu-tree.html',
  styleUrl: './menu-tree.css',
})
export class MenuTree {
  menu = input<Menu | null>(null);

  dateLabel(menu: Menu): string | null {
    if (!menu.starts_at) return null;
    if (menu.ends_at === menu.starts_at) return `Menu du ${menu.starts_at}`;
    if (!menu.ends_at) return `À partir du ${menu.starts_at}`;
    return `Du ${menu.starts_at} au ${menu.ends_at}`;
  }

  print(): void {
    window.print();
  }

  generatedAt(): string {
    return new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
