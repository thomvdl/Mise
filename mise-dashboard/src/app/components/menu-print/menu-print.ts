import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { MenuService } from '../../core/services/menu.service';
import { Menu } from '../../core/models/menu.model';

@Component({
  selector: 'app-menu-print',
  imports: [RouterLink],
  templateUrl: './menu-print.html',
  styleUrl: './menu-print.css',
})
export class MenuPrint {
  private readonly route = inject(ActivatedRoute);
  private readonly menuService = inject(MenuService);

  private readonly menuId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: NaN },
  );

  menu = signal<Menu | null>(null);

  dateLabel = computed(() => {
    const menu = this.menu();
    if (!menu?.starts_at) return null;
    if (menu.ends_at === menu.starts_at) return `Menu du ${menu.starts_at}`;
    if (!menu.ends_at) return `À partir du ${menu.starts_at}`;
    return `Du ${menu.starts_at} au ${menu.ends_at}`;
  });

  constructor() {
    effect(() => {
      const id = this.menuId();
      if (!id || Number.isNaN(id)) return;
      this.menuService.get(id).subscribe((menu) => this.menu.set(menu));
    });
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
