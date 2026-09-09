import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { map } from 'rxjs';

import { MenuService } from '../../core/services/menu.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { Menu } from '../../core/models/menu.model';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { Allergen } from '../../core/models/allergen.model';
import { buildAllergenGrid } from '../../core/utils/menu-allergen-grid';
import { useReportTitle } from '../../core/utils/report-title';

@Component({
  selector: 'app-menu-allergen-grid',
  imports: [RouterLink],
  templateUrl: './menu-allergen-grid.html',
  styleUrl: './menu-allergen-grid.css',
})
export class MenuAllergenGrid {
  private readonly route = inject(ActivatedRoute);
  private readonly menuService = inject(MenuService);
  private readonly allergenService = new SimpleEntityService<Allergen>(inject(HttpClient), 'allergens');
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

  private readonly allergens = toSignal(this.allergenService.list(), { initialValue: [] as Allergen[] });

  grid = computed(() =>
    this.menu()
      ? buildAllergenGrid(this.menu()!, this.fichesById(), this.ingredientsById(), this.allergens())
      : null,
  );

  isEmpty = computed(() => this.grid() !== null && this.grid()!.rows.length === 0);

  constructor() {
    effect(() => {
      const id = this.menuId();
      if (!id || Number.isNaN(id)) return;
      this.menuService.get(id).subscribe((menu) => this.menu.set(menu));
    });

    effect(() => {
      const menu = this.menu();
      this.setReportTitle(menu ? `Grille allergènes — ${menu.name}` : 'Grille allergènes');
    });
  }

  hasAllergen(row: { allergenIds: Set<number> }, allergenId: number): boolean {
    return row.allergenIds.has(allergenId);
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
