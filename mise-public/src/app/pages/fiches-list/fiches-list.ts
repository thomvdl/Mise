import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { StationService } from '../../core/services/station.service';
import { CategoryService } from '../../core/services/category.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Station } from '../../core/models/station.model';
import { Category } from '../../core/models/category.model';

/**
 * Page d'accueil des fiches techniques — un tableau consultation seule (recherche + filtres
 * poste/catégorie), sans les actions d'édition du dashboard. Un `?id=` dans l'URL (utilisé par
 * menu-tree pour pointer directement vers une fiche) saute ce tableau et redirige vers la vue
 * détail, pour ne pas casser ce lien existant.
 */
@Component({
  selector: 'app-fiches-list',
  imports: [RouterLink],
  templateUrl: './fiches-list.html',
  styleUrl: './fiches-list.css',
})
export class FichesList {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  stations = toSignal(inject(StationService).list(), { initialValue: [] as Station[] });
  categories = toSignal(inject(CategoryService).list(), { initialValue: [] as Category[] });
  fiches = toSignal(inject(FicheTechniqueService).list(), { initialValue: [] as FicheTechnique[] });

  search = signal('');
  selectedStationId = signal<number | null>(null);
  selectedCategoryId = signal<number | null>(null);

  private readonly queryParamId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  filteredFiches = computed(() => {
    const query = this.search().trim().toLowerCase();
    const stationId = this.selectedStationId();
    const categoryId = this.selectedCategoryId();

    return this.fiches()
      .filter((fiche) => {
        const matchesQuery = !query || fiche.name.toLowerCase().includes(query);
        const matchesStation = stationId === null || fiche.station_id === stationId;
        const matchesCategory = categoryId === null || fiche.category_id === categoryId;
        return matchesQuery && matchesStation && matchesCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  });

  totalCount = computed(() => this.filteredFiches().length);

  constructor() {
    effect(() => {
      const id = this.queryParamId();
      if (id !== null) {
        this.router.navigate(['/fiches/recherche'], { queryParams: { id }, replaceUrl: true });
      }
    });
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onStationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStationId.set(value ? Number(value) : null);
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(value ? Number(value) : null);
  }
}
