import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { RecipeFilters } from '../../components/recipe-filters/recipe-filters';
import { RecipeList } from '../../components/recipe-list/recipe-list';
import { RecipeDetail } from '../../components/recipe-detail/recipe-detail';

import { StationService } from '../../core/services/station.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { Ingredient } from '../../core/models/ingredient.model';
import { enrichFicheTechnique } from '../../core/utils/enrich-fiche-technique';

@Component({
  selector: 'app-home',
  imports: [RecipeFilters, RecipeList, RecipeDetail],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly stationService = inject(StationService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly ingredientService = inject(IngredientService);
  private readonly route = inject(ActivatedRoute);

  stations = toSignal(this.stationService.list(), { initialValue: [] });
  ficheTechniques = toSignal(this.ficheTechniqueService.list(), { initialValue: [] });
  ingredientsById = toSignal(
    this.ingredientService.list().pipe(map((ingredients) => new Map<number, Ingredient>(
      ingredients.map((ingredient) => [ingredient.id, ingredient]),
    ))),
    { initialValue: new Map<number, Ingredient>() },
  );

  activeStationSlug = signal<string | null>(null);
  searchQuery = signal('');
  selectedId = signal<number | null>(null);

  /** `/fiches?id=123` — set by links that navigate straight to a given recipe (e.g. from a menu). */
  private readonly queryParamId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  enrichedFiches = computed(() =>
    this.ficheTechniques().map((fiche) => enrichFicheTechnique(fiche, this.ingredientsById())),
  );

  filteredFiches = computed(() => {
    const station = this.activeStationSlug();
    const query = this.searchQuery().trim().toLowerCase();

    return this.enrichedFiches().filter((fiche) => {
      const matchesStation = !station || fiche.station?.slug === station;
      const matchesQuery = !query || fiche.name.toLowerCase().includes(query);
      return matchesStation && matchesQuery;
    });
  });

  selectedFiche = computed(
    () => this.enrichedFiches().find((fiche) => fiche.id === this.selectedId()) ?? null,
  );

  constructor() {
    effect(() => {
      const idParam = this.queryParamId();
      if (idParam === null) return;

      const id = Number(idParam);
      if (!Number.isNaN(id)) {
        this.selectedId.set(id);
      }
    });

    effect(() => {
      const list = this.filteredFiches();
      if (this.selectedId() === null && list.length > 0) {
        this.selectedId.set(list[0].id);
      }
    });
  }
}
