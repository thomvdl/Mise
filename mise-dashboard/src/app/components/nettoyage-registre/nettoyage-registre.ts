import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { NettoyageRealisation } from '../../core/models/nettoyage-tache.model';
import { NettoyageRealisationService } from '../../core/services/nettoyage-realisation.service';
import { NettoyageTacheService } from '../../core/services/nettoyage-tache.service';
import { useReportTitle } from '../../core/utils/report-title';

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Lundi de la semaine en cours — période affichée par défaut. */
function mondayOfThisWeek(): Date {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
}

/**
 * Registre du plan de nettoyage (qui a fait quoi, quand), en lecture seule et imprimable — c'est
 * la trace écrite demandée lors d'un contrôle. Les lignes sont saisies depuis la cuisine
 * (mise-public) et ne peuvent être ni modifiées ni supprimées.
 */
@Component({
  selector: 'app-nettoyage-registre',
  imports: [RouterLink],
  templateUrl: './nettoyage-registre.html',
  styleUrl: './nettoyage-registre.css',
})
export class NettoyageRegistre implements OnInit {
  private readonly realisationService = inject(NettoyageRealisationService);
  private readonly nettoyageService = inject(NettoyageTacheService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  readonly today = toIsoDate(new Date());

  from = signal(toIsoDate(mondayOfThisWeek()));
  to = signal(this.today);
  zone = signal('');
  zones = signal<string[]>([]);

  realisations = signal<NettoyageRealisation[]>([]);
  loading = signal(false);

  periodLabel = computed(() =>
    this.from() === this.to() ? `Le ${formatDay(this.from())}` : `Du ${formatDay(this.from())} au ${formatDay(this.to())}`,
  );

  /** Nombre de personnes différentes sur la période, pour le résumé. */
  peopleCount = computed(() => new Set(this.realisations().map((r) => r.user_name)).size);

  ngOnInit(): void {
    this.nettoyageService.list().subscribe((taches) =>
      this.zones.set([...new Set(taches.map((t) => t.zone))].sort((a, b) => a.localeCompare(b, 'fr'))),
    );
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.realisationService.list({ from: this.from(), to: this.to(), zone: this.zone() }).subscribe({
      next: (items) => {
        this.realisations.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFromChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    this.from.set(value);
    if (this.to() < value) this.to.set(value);
    this.reload();
  }

  onToChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    this.to.set(value);
    if (this.from() > value) this.from.set(value);
    this.reload();
  }

  onZoneChange(event: Event): void {
    this.zone.set((event.target as HTMLSelectElement).value);
    this.reload();
  }

  print(): void {
    const zone = this.zone() ? ` — ${this.zone()}` : '';
    this.setReportTitle(`Registre de nettoyage${zone} — ${this.from()} au ${this.to()}`);
    window.print();
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
