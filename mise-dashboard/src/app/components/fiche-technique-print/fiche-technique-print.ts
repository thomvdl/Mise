import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { map } from 'rxjs';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { enrichFicheTechnique, uniqueAllergens } from '../../core/utils/enrich-fiche-technique';
import { useReportTitle } from '../../core/utils/report-title';

@Component({
  selector: 'app-fiche-technique-print',
  imports: [RouterLink],
  templateUrl: './fiche-technique-print.html',
  styleUrl: './fiche-technique-print.css',
})
export class FicheTechniquePrint {
  private readonly route = inject(ActivatedRoute);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly ingredientService = inject(IngredientService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  private readonly ficheId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: NaN },
  );

  private readonly rawFiche = signal<FicheTechnique | null>(null);

  private readonly ingredientsById = toSignal(
    this.ingredientService.list().pipe(
      map((ingredients) => new Map<number, Ingredient>(ingredients.map((i) => [i.id, i]))),
    ),
    { initialValue: new Map<number, Ingredient>() },
  );

  /** `FicheTechniqueController` n'eager-load pas ingredients.allergens — voir enrichFicheTechnique. */
  fiche = computed(() => {
    const fiche = this.rawFiche();
    return fiche ? enrichFicheTechnique(fiche, this.ingredientsById()) : null;
  });

  allergens = computed(() => {
    const fiche = this.fiche();
    return fiche ? uniqueAllergens(fiche) : [];
  });

  constructor() {
    effect(() => {
      const id = this.ficheId();
      if (!id || Number.isNaN(id)) return;
      this.ficheTechniqueService.get(id).subscribe((fiche) => this.rawFiche.set(fiche));
    });

    effect(() => {
      const fiche = this.fiche();
      this.setReportTitle(fiche ? `Fiche technique — ${fiche.name}` : 'Fiche technique');
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
