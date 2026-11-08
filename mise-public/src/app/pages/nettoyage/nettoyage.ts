import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  NETTOYAGE_FREQUENCES,
  NettoyageTache,
  frequenceLabel,
  frequenceRank,
} from '../../core/models/nettoyage-tache.model';
import { NettoyageTacheService } from '../../core/services/nettoyage-tache.service';

interface ZoneGroup {
  zone: string;
  taches: NettoyageTache[];
}

/** Plan de nettoyage en consultation seule — l'édition se fait depuis le dashboard. */
@Component({
  selector: 'app-nettoyage',
  imports: [],
  templateUrl: './nettoyage.html',
  styleUrl: './nettoyage.css',
})
export class Nettoyage implements OnInit {
  private readonly nettoyageService = inject(NettoyageTacheService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly frequences = NETTOYAGE_FREQUENCES;

  taches = signal<NettoyageTache[]>([]);
  loaded = signal(false);
  frequence = signal('');
  /** Poste/lieu sélectionné ('' = tous). Repris dans l'URL (`?zone=`) pour qu'une tablette de
   * poste puisse garder un favori directement filtré sur son poste. */
  zone = signal(this.route.snapshot.queryParamMap.get('zone') ?? '');

  /** Tous les postes/lieux du plan, indépendamment du filtre de fréquence. */
  allZones = computed(() =>
    [...new Set(this.taches().map((t) => t.zone))].sort((a, b) => a.localeCompare(b, 'fr')),
  );

  /** Une carte par zone, tâches de la plus fréquente à la moins fréquente. */
  zones = computed<ZoneGroup[]>(() => {
    const frequence = this.frequence();
    const zone = this.zone();
    const groups = new Map<string, NettoyageTache[]>();
    for (const tache of this.taches()) {
      if (frequence && tache.frequence !== frequence) continue;
      if (zone && tache.zone !== zone) continue;
      groups.set(tache.zone, [...(groups.get(tache.zone) ?? []), tache]);
    }

    return [...groups.entries()]
      .map(([zone, taches]) => ({
        zone,
        taches: taches.sort(
          (a, b) => frequenceRank(a.frequence) - frequenceRank(b.frequence) || a.name.localeCompare(b.name, 'fr'),
        ),
      }))
      .sort((a, b) => a.zone.localeCompare(b.zone, 'fr'));
  });

  ngOnInit(): void {
    this.nettoyageService.list().subscribe({
      next: (taches) => {
        this.taches.set(taches);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true),
    });
  }

  selectZone(zone: string): void {
    this.zone.set(zone);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { zone: zone || null },
      replaceUrl: true,
    });
  }

  protected readonly frequenceLabel = frequenceLabel;
}
