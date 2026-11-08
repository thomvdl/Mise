import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import {
  NETTOYAGE_FREQUENCES,
  NettoyageRealisation,
  NettoyageTache,
  formatRealisation,
  frequenceLabel,
  frequenceRank,
  isFaitPourPeriode,
} from '../../core/models/nettoyage-tache.model';
import { AuthService } from '../../core/services/auth.service';
import { NettoyageRealisationService } from '../../core/services/nettoyage-realisation.service';
import { NettoyageTacheService } from '../../core/services/nettoyage-tache.service';

interface ZoneGroup {
  zone: string;
  taches: NettoyageTache[];
}

/** Plan de nettoyage : consultation et registre « fait par » — l'édition du plan se fait depuis
 * le dashboard. */
@Component({
  selector: 'app-nettoyage',
  imports: [ConfirmDialog],
  templateUrl: './nettoyage.html',
  styleUrl: './nettoyage.css',
})
export class Nettoyage implements OnInit {
  private readonly nettoyageService = inject(NettoyageTacheService);
  private readonly realisationService = inject(NettoyageRealisationService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly frequences = NETTOYAGE_FREQUENCES;

  taches = signal<NettoyageTache[]>([]);
  loaded = signal(false);
  frequence = signal('');
  /** Poste/lieu sélectionné ('' = tous). Repris dans l'URL (`?zone=`) pour qu'une tablette de
   * poste puisse garder un favori directement filtré sur son poste. */
  zone = signal(this.route.snapshot.queryParamMap.get('zone') ?? '');
  /** N'afficher que ce qui n'est pas encore fait pour sa période (pratique en fin de service). */
  resteAFaire = signal(false);

  /** Tâche en attente de confirmation avant d'être marquée faite (un tap accidentel ne doit pas
   * écrire dans un registre qu'on ne peut plus corriger). */
  pendingTache = signal<NettoyageTache | null>(null);
  saving = signal<number | null>(null);
  errorMessage = signal<string | null>(null);

  /** Historique dépliable par tâche — chargé à la demande, `null` pendant le chargement. */
  histories = signal<Record<number, NettoyageRealisation[] | null>>({});

  confirmMessage = computed(() => {
    const tache = this.pendingTache();
    const user = this.auth.user()?.name ?? '';
    return tache ? `Marquer « ${tache.name} » (${tache.zone}) comme fait maintenant, par ${user} ?` : '';
  });

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
      if (this.resteAFaire() && (!this.isTrackable(tache) || this.isFait(tache))) continue;
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

  /** « Après chaque utilisation » est un réflexe continu : pas de case « fait » à cocher. */
  isTrackable(tache: NettoyageTache): boolean {
    return tache.frequence !== 'apres_utilisation';
  }

  isFait(tache: NettoyageTache): boolean {
    return isFaitPourPeriode(tache);
  }

  requestFait(tache: NettoyageTache): void {
    this.pendingTache.set(tache);
  }

  cancelFait(): void {
    this.pendingTache.set(null);
  }

  confirmFait(): void {
    const tache = this.pendingTache();
    if (!tache) return;
    this.pendingTache.set(null);

    this.saving.set(tache.id);
    this.errorMessage.set(null);
    this.realisationService.create(tache.id).subscribe({
      next: (realisation) => {
        this.saving.set(null);
        this.taches.update((taches) =>
          taches.map((t) => (t.id === tache.id ? { ...t, derniere_realisation: realisation } : t)),
        );
        // Historique déjà ouvert : on y ajoute la ligne plutôt que de le recharger.
        this.histories.update((h) =>
          Array.isArray(h[tache.id]) ? { ...h, [tache.id]: [realisation, ...h[tache.id]!] } : h,
        );
      },
      error: () => {
        this.saving.set(null);
        this.errorMessage.set(`Impossible d'enregistrer « ${tache.name} ». Vérifiez la connexion et réessayez.`);
      },
    });
  }

  isHistoryOpen(tacheId: number): boolean {
    return tacheId in this.histories();
  }

  toggleHistory(tacheId: number): void {
    if (this.isHistoryOpen(tacheId)) {
      this.histories.update(({ [tacheId]: _removed, ...rest }) => rest);
      return;
    }
    this.histories.update((h) => ({ ...h, [tacheId]: null }));
    this.realisationService.history(tacheId).subscribe({
      next: (items) => this.histories.update((h) => (tacheId in h ? { ...h, [tacheId]: items } : h)),
      error: () => this.histories.update((h) => (tacheId in h ? { ...h, [tacheId]: [] } : h)),
    });
  }

  protected readonly frequenceLabel = frequenceLabel;
  protected readonly formatRealisation = formatRealisation;
}
