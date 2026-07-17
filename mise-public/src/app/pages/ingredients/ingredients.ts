import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';

import { IngredientService } from '../../core/services/ingredient.service';

@Component({
  selector: 'app-ingredients',
  imports: [DecimalPipe],
  templateUrl: './ingredients.html',
  styleUrl: './ingredients.css',
})
export class Ingredients {
  private readonly ingredientService = inject(IngredientService);

  ingredients = toSignal(this.ingredientService.list(), { initialValue: [] });

  search = signal('');
  selectedCategoryId = signal<number | null>(null);

  /** Categories present in the loaded ingredients, sorted A→Z. */
  categories = computed(() => {
    const byId = new Map<number, { id: number; name: string }>();
    for (const ingredient of this.ingredients()) {
      if (ingredient.category) byId.set(ingredient.category.id, ingredient.category);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  });

  /**
   * Filtered by name search and category, then sorted by category name (A→Z, uncategorized last),
   * then by ingredient name (A→Z) within each category.
   */
  sortedIngredients = computed(() => {
    const query = this.search().trim().toLowerCase();
    const categoryId = this.selectedCategoryId();

    const filtered = this.ingredients().filter((ingredient) => {
      const matchesQuery = !query || ingredient.name.toLowerCase().includes(query);
      const matchesCategory = categoryId === null || ingredient.category?.id === categoryId;
      return matchesQuery && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      const categoryA = a.category?.name ?? null;
      const categoryB = b.category?.name ?? null;

      if (categoryA === null && categoryB !== null) return 1;
      if (categoryA !== null && categoryB === null) return -1;

      const categoryCompare = categoryA && categoryB ? categoryA.localeCompare(categoryB, 'fr', { sensitivity: 'base' }) : 0;
      if (categoryCompare !== 0) return categoryCompare;

      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
  });

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(value ? Number(value) : null);
  }
}
