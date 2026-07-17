import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { IngredientService } from '../../core/services/ingredient.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { Ingredient } from '../../core/models/ingredient.model';
import { IngredientCategory } from '../../core/models/ingredient-category.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-ingredient-list',
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './ingredient-list.html',
  styleUrl: './ingredient-list.css',
})
export class IngredientList implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly ingredientService = inject(IngredientService);
  private readonly categoryService = new SimpleEntityService<IngredientCategory>(this.http, 'ingredient-categories');

  items = signal<Ingredient[]>([]);
  categories = signal<IngredientCategory[]>([]);
  search = signal('');
  selectedCategoryId = signal<number | null>(null);
  pendingDelete = signal<Ingredient | null>(null);
  sortKey = signal<'name' | 'category' | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');

  filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const categoryId = this.selectedCategoryId();

    const items = this.items().filter((item) => {
      const matchesQuery = !query || item.name.toLowerCase().includes(query);
      const matchesCategory = categoryId === null || item.category?.id === categoryId;
      return matchesQuery && matchesCategory;
    });

    const key = this.sortKey();
    if (!key) {
      // Default order: category A→Z (uncategorized last), then name A→Z within each category.
      return [...items].sort((a, b) => {
        const categoryA = a.category?.name ?? null;
        const categoryB = b.category?.name ?? null;

        if (categoryA === null && categoryB !== null) return 1;
        if (categoryA !== null && categoryB === null) return -1;

        const categoryCompare =
          categoryA && categoryB ? categoryA.localeCompare(categoryB, 'fr', { sensitivity: 'base' }) : 0;
        if (categoryCompare !== 0) return categoryCompare;

        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      });
    }

    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const valueA = key === 'name' ? a.name : (a.category?.name ?? '');
      const valueB = key === 'name' ? b.name : (b.category?.name ?? '');
      return valueA.localeCompare(valueB) * dir;
    });
  });

  deleteMessage = computed(() => {
    const item = this.pendingDelete();
    return item ? `Supprimer l'ingrédient « ${item.name} » ? Cette action est irréversible.` : '';
  });

  ngOnInit(): void {
    this.reload();
    this.categoryService.list().subscribe((items) => this.categories.set(items));
  }

  reload(): void {
    this.ingredientService.list().subscribe((items) => this.items.set(items));
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(value ? Number(value) : null);
  }

  setSort(key: 'name' | 'category'): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  confirmDelete(item: Ingredient): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.ingredientService.delete(item.id).subscribe(() => {
      this.items.update((items) => items.filter((i) => i.id !== item.id));
      this.pendingDelete.set(null);
    });
  }
}
