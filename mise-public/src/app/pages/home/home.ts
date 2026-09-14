import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { RecipeDetail } from '../../components/recipe-detail/recipe-detail';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { enrichFicheTechnique } from '../../core/utils/enrich-fiche-technique';

/**
 * Vue détail seule — la sélection se fait via le tableau `/fiches`, cette page se contente
 * d'afficher la fiche pointée par `?id=` (lien depuis le tableau, un menu, ou tout autre appelant).
 * Pas de liste ni de filtres ici : ç'a été retiré au profit du tableau, plus adapté pour parcourir
 * et filtrer par poste/catégorie.
 */
@Component({
  selector: 'app-home',
  imports: [RecipeDetail, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly ingredientService = inject(IngredientService);
  private readonly route = inject(ActivatedRoute);

  private readonly rawFiche = signal<FicheTechnique | null>(null);

  ingredientsById = toSignal(
    this.ingredientService.list().pipe(map((ingredients) => new Map<number, Ingredient>(
      ingredients.map((ingredient) => [ingredient.id, ingredient]),
    ))),
    { initialValue: new Map<number, Ingredient>() },
  );

  /** `FicheTechniqueController` n'eager-load pas ingredients.allergens — voir enrichFicheTechnique. */
  fiche = computed(() => {
    const fiche = this.rawFiche();
    return fiche ? enrichFicheTechnique(fiche, this.ingredientsById()) : null;
  });

  /** `?id=123` — posé par le tableau /fiches, un menu, ou tout autre lien direct vers une fiche. */
  private readonly queryParamId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  constructor() {
    effect(() => {
      const idParam = this.queryParamId();
      const id = idParam !== null ? Number(idParam) : NaN;

      if (Number.isNaN(id)) {
        this.rawFiche.set(null);
        return;
      }

      this.ficheTechniqueService.get(id).subscribe({
        next: (fiche) => this.rawFiche.set(fiche),
        error: () => this.rawFiche.set(null),
      });
    });
  }
}
