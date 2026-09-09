import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { StationService } from '../../core/services/station.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Station } from '../../core/models/station.model';

interface Column {
  station: Station | null;
  fiches: FicheTechnique[];
}

/**
 * Page d'accueil des fiches techniques — un tableau en colonnes par poste, pensé pour repérer
 * une fiche d'un coup d'œil plutôt que de fouiller dans la liste+détail de /fiches/recherche
 * (toujours accessible pour la recherche par nom/poste et la lecture d'une fiche). Un `?id=`
 * dans l'URL (utilisé par menu-tree pour pointer directement vers une fiche) saute ce tableau
 * et redirige vers la vue détail, pour ne pas casser ce lien existant.
 */
@Component({
  selector: 'app-fiches-board',
  imports: [RouterLink],
  templateUrl: './fiches-board.html',
  styleUrl: './fiches-board.css',
})
export class FichesBoard {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  stations = toSignal(inject(StationService).list(), { initialValue: [] as Station[] });
  fiches = toSignal(inject(FicheTechniqueService).list(), { initialValue: [] as FicheTechnique[] });

  search = signal('');

  private readonly queryParamId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  filteredFiches = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.fiches();
    return this.fiches().filter((fiche) => fiche.name.toLowerCase().includes(query));
  });

  columns = computed<Column[]>(() => {
    const fiches = this.filteredFiches();
    const columns: Column[] = this.stations().map((station) => ({
      station,
      fiches: fiches.filter((fiche) => fiche.station_id === station.id),
    }));

    const withoutStation = fiches.filter((fiche) => fiche.station_id === null);
    if (withoutStation.length > 0) {
      columns.push({ station: null, fiches: withoutStation });
    }

    return columns;
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
}
