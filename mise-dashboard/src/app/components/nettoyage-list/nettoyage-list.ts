import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  NETTOYAGE_FREQUENCES,
  NettoyageTache,
  formatRealisation,
  frequenceLabel,
  frequenceRank,
  isFaitPourPeriode,
} from '../../core/models/nettoyage-tache.model';
import { NettoyageTacheService } from '../../core/services/nettoyage-tache.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-nettoyage-list',
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './nettoyage-list.html',
  styleUrl: './nettoyage-list.css',
})
export class NettoyageList implements OnInit {
  private readonly nettoyageService = inject(NettoyageTacheService);

  readonly frequences = NETTOYAGE_FREQUENCES;

  items = signal<NettoyageTache[]>([]);
  search = signal('');
  frequence = signal('');
  pendingDelete = signal<NettoyageTache | null>(null);

  /** Trié par zone, puis de la tâche la plus fréquente à la moins fréquente. */
  filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const frequence = this.frequence();
    return this.items()
      .filter((item) => !frequence || item.frequence === frequence)
      .filter(
        (item) =>
          !query ||
          [item.zone, item.name, item.produit ?? '', item.responsable ?? ''].some((v) => v.toLowerCase().includes(query)),
      )
      .sort(
        (a, b) =>
          a.zone.localeCompare(b.zone, 'fr') ||
          frequenceRank(a.frequence) - frequenceRank(b.frequence) ||
          a.name.localeCompare(b.name, 'fr'),
      );
  });

  deleteMessage = computed(() => {
    const item = this.pendingDelete();
    return item ? `Supprimer « ${item.name} » (${item.zone}) du plan de nettoyage ?` : '';
  });

  ngOnInit(): void {
    this.nettoyageService.list().subscribe((items) => this.items.set(items));
  }

  /** La zone n'est affichée que sur la première ligne de chaque groupe, pour lire le plan par zone. */
  isFirstOfZone(index: number): boolean {
    const list = this.filtered();
    return index === 0 || list[index - 1].zone !== list[index].zone;
  }

  confirmDelete(item: NettoyageTache): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.nettoyageService.delete(item.id).subscribe(() => {
      this.items.update((items) => items.filter((i) => i.id !== item.id));
      this.pendingDelete.set(null);
    });
  }

  /** Faite pour sa période en cours (aujourd'hui, cette semaine…) — affichée en vert. */
  isFait(item: NettoyageTache): boolean {
    return isFaitPourPeriode(item);
  }

  protected readonly frequenceLabel = frequenceLabel;
  protected readonly formatRealisation = formatRealisation;
}
