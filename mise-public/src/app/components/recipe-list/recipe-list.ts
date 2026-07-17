import { Component, input, output } from '@angular/core';

import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { uniqueAllergens } from '../../core/utils/enrich-fiche-technique';

@Component({
  selector: 'app-recipe-list',
  imports: [],
  templateUrl: './recipe-list.html',
  styleUrl: './recipe-list.css',
})
export class RecipeList {
  fiches = input<FicheTechnique[]>([]);
  selectedId = input<number | null>(null);
  select = output<number>();

  allergens(fiche: FicheTechnique) {
    return uniqueAllergens(fiche);
  }
}
