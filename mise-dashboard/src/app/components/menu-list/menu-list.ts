import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MenuService } from '../../core/services/menu.service';
import { Menu } from '../../core/models/menu.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { menuToMarkdown, menusToMarkdown } from '../../core/utils/menu-markdown';
import { downloadTextFile } from '../../core/utils/download';

@Component({
  selector: 'app-menu-list',
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './menu-list.html',
  styleUrl: './menu-list.css',
})
export class MenuList implements OnInit {
  private readonly menuService = inject(MenuService);

  items = signal<Menu[]>([]);
  search = signal('');
  pendingDelete = signal<Menu | null>(null);
  selected = signal<Set<number>>(new Set());

  filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.items();
    return this.items().filter((item) => item.name.toLowerCase().includes(query));
  });

  /** Coché seulement si toutes les lignes actuellement visibles (filtrées par la recherche) le sont. */
  allSelected = computed(() => {
    const visible = this.filtered();
    return visible.length > 0 && visible.every((item) => this.selected().has(item.id));
  });

  deleteMessage = computed(() => {
    const item = this.pendingDelete();
    return item ? `Supprimer le menu « ${item.name} » ? Cette action est irréversible.` : '';
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.menuService.list().subscribe((items) => this.items.set(items));
  }

  dateLabel(menu: Menu): string {
    if (!menu.starts_at) return '—';
    if (menu.ends_at === menu.starts_at) return menu.starts_at;
    if (!menu.ends_at) return `À partir du ${menu.starts_at}`;
    return `${menu.starts_at} → ${menu.ends_at}`;
  }

  sectionCount(menu: Menu): number {
    return menu.sections?.length ?? 0;
  }

  platCount(menu: Menu): number {
    return (menu.sections ?? []).reduce((sum, section) => sum + (section.plats?.length ?? 0), 0);
  }

  confirmDelete(item: Menu): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.menuService.delete(item.id).subscribe(() => {
      this.items.update((items) => items.filter((i) => i.id !== item.id));
      this.selected.update((set) => {
        if (!set.has(item.id)) return set;
        const next = new Set(set);
        next.delete(item.id);
        return next;
      });
      this.pendingDelete.set(null);
    });
  }

  exportOne(item: Menu): void {
    downloadTextFile(`${item.slug}.md`, menuToMarkdown(item));
  }

  isSelected(id: number): boolean {
    return this.selected().has(id);
  }

  toggleSelected(id: number): void {
    this.selected.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    const visibleIds = this.filtered().map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => this.selected().has(id));

    this.selected.update((set) => {
      const next = new Set(set);
      visibleIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  exportSelection(): void {
    const selectedItems = this.items().filter((item) => this.selected().has(item.id));
    if (selectedItems.length === 0) return;
    downloadTextFile('menus.md', menusToMarkdown(selectedItems));
  }
}
