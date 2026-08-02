import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { map } from 'rxjs';

import { MenuService } from '../../core/services/menu.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { Menu } from '../../core/models/menu.model';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { buildShoppingList } from '../../core/utils/menu-shopping-list';
import { useReportTitle } from '../../core/utils/report-title';

const DEFAULT_COVERS = 10;

@Component({
  selector: 'app-menu-shopping-list',
  imports: [RouterLink],
  templateUrl: './menu-shopping-list.html',
  styleUrl: './menu-shopping-list.css',
})
export class MenuShoppingList {
  private readonly route = inject(ActivatedRoute);
  private readonly menuService = inject(MenuService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  private readonly menuId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: NaN },
  );

  menu = signal<Menu | null>(null);

  private readonly fichesById = toSignal(
    inject(FicheTechniqueService).list().pipe(
      map((fiches) => new Map<number, FicheTechnique>(fiches.map((f) => [f.id, f]))),
    ),
    { initialValue: new Map<number, FicheTechnique>() },
  );

  private readonly ingredientsById = toSignal(
    inject(IngredientService).list().pipe(
      map((ingredients) => new Map<number, Ingredient>(ingredients.map((i) => [i.id, i]))),
    ),
    { initialValue: new Map<number, Ingredient>() },
  );

  covers = signal(DEFAULT_COVERS);

  /** Cases cochées pendant les courses — état purement local, jamais persisté. */
  private readonly checked = signal<Set<number>>(new Set());

  groups = computed(() =>
    this.menu() ? buildShoppingList(this.menu()!, this.fichesById(), this.ingredientsById(), this.covers()) : [],
  );

  isEmpty = computed(() => this.groups().every((group) => group.lines.length === 0) && this.menu() !== null);

  constructor() {
    effect(() => {
      const id = this.menuId();
      if (!id || Number.isNaN(id)) return;
      this.menuService.get(id).subscribe((menu) => this.menu.set(menu));
    });

    effect(() => {
      const menu = this.menu();
      this.setReportTitle(
        menu ? `Liste de courses — ${menu.name} — ${this.covers()} couverts` : 'Liste de courses',
      );
    });
  }

  onCoversInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (value > 0) this.covers.set(value);
  }

  isChecked(ingredientId: number): boolean {
    return this.checked().has(ingredientId);
  }

  toggleChecked(ingredientId: number): void {
    this.checked.update((set) => {
      const next = new Set(set);
      next.has(ingredientId) ? next.delete(ingredientId) : next.add(ingredientId);
      return next;
    });
  }

  formatQuantity(value: number): string {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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

  print(): void {
    window.print();
  }
}
