import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';

import { FriteuseService } from '../../core/services/friteuse.service';
import { ChangementHuile } from '../../core/models/changement-huile.model';
import { ChangementHuileService } from '../../core/services/changement-huile.service';
import { isChangeOverdue, lastChangeDate, nextChangeDate } from '../../core/utils/friteuse-schedule';
import { todayDDMMYYYY, useReportTitle } from '../../core/utils/report-title';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

type Period = 'semaine' | 'mois' | 'annee';

/** Valeur du sélecteur de friteuse pour le rapport complet, toutes friteuses confondues. */
const ALL = 'all';
type FriteuseSelection = number | typeof ALL;

// 'mois' et 'annee' n'ont pas de libellé statique — periodLabel() le dérive du mois/année choisi.
const PERIOD_LABELS: Record<Period, string> = {
  semaine: '7 derniers jours',
  mois: '',
  annee: '',
};

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function currentMonthIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(monthIso: string): { from: Date; to: Date } {
  const [year, month] = monthIso.split('-').map(Number);
  return { from: new Date(year, month - 1, 1), to: new Date(year, month, 0) };
}

function yearRange(year: number): { from: Date; to: Date } {
  return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
}

function rangeStart(period: 'semaine'): Date {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date;
}

@Component({
  selector: 'app-huile-report',
  imports: [ConfirmDialog],
  templateUrl: './huile-report.html',
  styleUrl: './huile-report.css',
})
export class HuileReport {
  private readonly friteuseService = inject(FriteuseService);
  private readonly changementHuileService = inject(ChangementHuileService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  readonly periods: { key: Period; label: string }[] = [
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois', label: 'Mois' },
    { key: 'annee', label: 'Année' },
  ];

  readonly ALL = ALL;
  readonly maxMonth = currentMonthIso();

  friteuses = toSignal(this.friteuseService.list(), { initialValue: [] });
  selectedFriteuseId = signal<FriteuseSelection | null>(null);
  period = signal<Period>('semaine');
  selectedMonth = signal<string>(currentMonthIso());
  selectedYear = signal<number>(new Date().getFullYear());
  availableYears = signal<number[]>([]);
  changements = signal<ChangementHuile[]>([]);
  loading = signal(false);

  /** Toujours aujourd'hui — même règle que côté public, pour ne pas pouvoir antidater/postdater
   * un changement depuis ce raccourci. */
  readonly today = toIsoDate(new Date());
  savingChange = signal(false);
  changeError = signal<string | null>(null);
  changeSuccess = signal<string | null>(null);
  confirmChangeOpen = signal(false);

  confirmChangeMessage = computed(() => {
    const friteuse = this.selectedFriteuse();
    return friteuse
      ? `Marquer l'huile de « ${friteuse.name} » comme changée aujourd'hui (${this.formatDate(this.today)}) ?`
      : '';
  });

  selectedFriteuse = computed(() => this.friteuses().find((f) => f.id === this.selectedFriteuseId()) ?? null);

  isAll = computed(() => this.selectedFriteuseId() === ALL);

  /** Mode "Toutes" : une ligne par friteuse, y compris celles sans changement sur la période. Le
   *  dernier/prochain changement viennent de l'historique complet de la friteuse (pas seulement
   *  de la période affichée), comme sur le rapport d'une seule friteuse. */
  summary = computed(() => {
    if (!this.isAll()) return [];

    const countByFriteuse = new Map<number, number>();
    for (const changement of this.changements()) {
      countByFriteuse.set(changement.friteuse_id, (countByFriteuse.get(changement.friteuse_id) ?? 0) + 1);
    }

    return this.friteuses().map((friteuse) => ({
      friteuse,
      count: countByFriteuse.get(friteuse.id) ?? 0,
      last: lastChangeDate(friteuse),
      next: nextChangeDate(friteuse),
      overdue: isChangeOverdue(friteuse),
    }));
  });

  overdueCount = computed(() => this.summary().filter((row) => row.overdue).length);

  reportTitle = computed(() => {
    const friteuse = this.selectedFriteuse();
    if (this.isAll()) return `Rapport de changement d'huile - Toutes les friteuses - ${this.periodLabel()}`;
    if (!friteuse) return "Rapport de changement d'huile";
    return `Rapport de changement d'huile - ${friteuse.name} - ${this.periodLabel()}`;
  });

  periodLabel = computed(() => {
    if (this.period() === 'mois') {
      const { from } = monthRange(this.selectedMonth());
      const label = from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    if (this.period() === 'annee') {
      return String(this.selectedYear());
    }
    return PERIOD_LABELS[this.period()];
  });

  nextChange = computed(() => {
    const friteuse = this.selectedFriteuse();
    return friteuse ? nextChangeDate(friteuse) : null;
  });

  constructor() {
    effect(() => {
      const friteuse = this.selectedFriteuse();
      this.setReportTitle(
        this.isAll()
          ? `Rapport huile — Toutes les friteuses — ${todayDDMMYYYY()}`
          : friteuse
            ? `Rapport huile — ${friteuse.name} — ${todayDDMMYYYY()}`
            : 'Rapport huile',
      );
    });

    effect(() => {
      // Vue "Toutes les friteuses" par défaut — sauf s'il n'y en a qu'une (l'option n'est alors pas proposée).
      const list = this.friteuses();
      if (list.length > 0 && this.selectedFriteuseId() === null) {
        this.selectedFriteuseId.set(list.length > 1 ? ALL : list[0].id);
      }
    });

    // Historique complet (sans filtre de date) juste pour connaître les années disponibles.
    effect(() => {
      const selection = this.selectedFriteuseId();
      if (selection === null) {
        this.availableYears.set([]);
        return;
      }

      this.changementHuileService.list({ friteuseId: selection === ALL ? undefined : selection }).subscribe((data) => {
        const years = [...new Set(data.map((c) => Number(c.date_changement.slice(0, 4))))].sort((a, b) => b - a);
        this.availableYears.set(years);
        if (years.length > 0 && !years.includes(this.selectedYear())) {
          this.selectedYear.set(years[0]);
        }
      });
    });

    effect(() => {
      this.loadChangements();
    });
  }

  private loadChangements(): void {
    const selection = this.selectedFriteuseId();
    const currentPeriod = this.period();
    const month = this.selectedMonth();
    const year = this.selectedYear();
    if (selection === null) {
      this.changements.set([]);
      return;
    }
    const friteuseId = selection === ALL ? undefined : selection;

    const { from, to } =
      currentPeriod === 'mois'
        ? monthRange(month)
        : currentPeriod === 'annee'
          ? yearRange(year)
          : { from: rangeStart('semaine'), to: new Date() };

    this.loading.set(true);
    this.changementHuileService.list({ friteuseId, from: toIsoDate(from), to: toIsoDate(to) }).subscribe((data) => {
      this.changements.set(data);
      this.loading.set(false);
    });
  }

  requestAddChange(): void {
    if (!this.selectedFriteuse()) return;
    this.confirmChangeOpen.set(true);
  }

  cancelAddChange(): void {
    this.confirmChangeOpen.set(false);
  }

  confirmAddChange(): void {
    const friteuse = this.selectedFriteuse();
    this.confirmChangeOpen.set(false);
    if (!friteuse) return;

    this.savingChange.set(true);
    this.changeError.set(null);
    this.changeSuccess.set(null);

    this.changementHuileService.create({ friteuse_id: friteuse.id, date_changement: this.today }).subscribe({
      next: () => {
        this.savingChange.set(false);
        this.changeSuccess.set(`Changement enregistré pour ${friteuse.name}.`);
        this.loadChangements();
      },
      error: () => {
        this.savingChange.set(false);
        this.changeError.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }

  onFriteuseChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedFriteuseId.set(value === ALL ? ALL : Number(value));
  }

  friteuseName(friteuseId: number): string {
    return this.friteuses().find((f) => f.id === friteuseId)?.name ?? '—';
  }

  setPeriod(period: Period): void {
    this.period.set(period);
  }

  onMonthChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.selectedMonth.set(value);
  }

  onYearChange(event: Event): void {
    this.selectedYear.set(Number((event.target as HTMLSelectElement).value));
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

  formatDate(value: string | Date): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  print(): void {
    window.print();
  }
}
