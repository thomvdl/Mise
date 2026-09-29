import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { formatQuantity as formatQuantityUtil } from '../../core/utils/format-quantity';
import { ShoppingListGroupBy, buildShoppingList, buildShoppingListCost } from '../../core/utils/menu-shopping-list';
import { useReportTitle } from '../../core/utils/report-title';

const DEFAULT_COVERS = 10;

@Component({
  selector: 'app-menu-shopping-list',
  imports: [RouterLink, DecimalPipe],
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

  /** Préremplissage depuis `?couverts=` (ex. lien "Voir la liste de courses" d'un événement du
   * calendrier) — lu une seule fois au chargement (snapshot), le champ reste ensuite modifiable
   * librement sans se refaire écraser si l'URL ne change pas. */
  covers = signal(this.readCoversFromQuery() ?? DEFAULT_COVERS);
  groupBy = signal<ShoppingListGroupBy>('categorie');
  /** Le coût total n'a de sens que si tout le menu part effectivement en cuisine pour le nombre
   * de couverts saisi — sur un menu à choix multiples (plusieurs propositions par section), la
   * somme surestime largement puisqu'un convive ne prend qu'une option, pas toutes. Désactivable
   * plutôt que masqué d'office : reste utile par défaut sur un menu sans choix. */
  showCost = signal(true);

  /** Cases cochées pendant les courses — état purement local, jamais persisté. */
  private readonly checked = signal<Set<number>>(new Set());

  groups = computed(() =>
    this.menu()
      ? buildShoppingList(this.menu()!, this.fichesById(), this.ingredientsById(), this.covers(), this.groupBy())
      : [],
  );

  isEmpty = computed(() => this.groups().every((group) => group.lines.length === 0) && this.menu() !== null);

  cost = computed(() =>
    this.menu()
      ? buildShoppingListCost(this.menu()!, this.fichesById(), this.ingredientsById(), this.covers())
      : null,
  );

  costPerCover = computed(() => {
    const cost = this.cost();
    const covers = this.covers();
    return cost && covers > 0 ? cost.totalCost / covers : null;
  });

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

  private readCoversFromQuery(): number | null {
    const raw = Number(this.route.snapshot.queryParamMap.get('couverts'));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  onCoversInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (value > 0) this.covers.set(value);
  }

  onGroupByInput(event: Event): void {
    this.groupBy.set((event.target as HTMLSelectElement).value as ShoppingListGroupBy);
  }

  onShowCostInput(event: Event): void {
    this.showCost.set((event.target as HTMLInputElement).checked);
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

  formatQuantity(value: number, unit: string): string {
    return formatQuantityUtil(value, unit);
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
