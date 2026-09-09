import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { AllergenService } from '../../core/services/allergen.service';
import { Menu } from '../../core/models/menu.model';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { Allergen } from '../../core/models/allergen.model';
import { buildAllergenGrid } from '../../core/utils/menu-allergen-grid';

@Component({
  selector: 'app-menu-allergen-grid',
  imports: [],
  templateUrl: './menu-allergen-grid.html',
  styleUrl: './menu-allergen-grid.css',
})
export class MenuAllergenGrid {
  menu = input<Menu | null>(null);

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

  private readonly allergens = toSignal(inject(AllergenService).list(), { initialValue: [] as Allergen[] });

  grid = computed(() => {
    const menu = this.menu();
    return menu ? buildAllergenGrid(menu, this.fichesById(), this.ingredientsById(), this.allergens()) : null;
  });

  hasAllergen(row: { allergenIds: Set<number> }, allergenId: number): boolean {
    return row.allergenIds.has(allergenId);
  }
}
