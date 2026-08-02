import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';

import { FriteuseService } from '../../core/services/friteuse.service';
import { ChangementHuile } from '../../core/models/changement-huile.model';
import { ChangementHuileService } from '../../core/services/changement-huile.service';
import { nextChangeDate } from '../../core/utils/friteuse-schedule';
import { todayDDMMYYYY, useReportTitle } from '../../core/utils/report-title';

type Period = 'semaine' | 'mois' | 'annee';

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
  imports: [DatePipe],
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

  readonly maxMonth = currentMonthIso();

  friteuses = toSignal(this.friteuseService.list(), { initialValue: [] });
  selectedFriteuseId = signal<number | null>(null);
  period = signal<Period>('semaine');
  selectedMonth = signal<string>(currentMonthIso());
  selectedYear = signal<number>(new Date().getFullYear());
  availableYears = signal<number[]>([]);
  changements = signal<ChangementHuile[]>([]);
  loading = signal(false);

  selectedFriteuse = computed(() => this.friteuses().find((f) => f.id === this.selectedFriteuseId()) ?? null);

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
        friteuse ? `Rapport huile — ${friteuse.name} — ${todayDDMMYYYY()}` : 'Rapport huile',
      );
    });

    effect(() => {
      const list = this.friteuses();
      if (list.length > 0 && this.selectedFriteuseId() === null) {
        this.selectedFriteuseId.set(list[0].id);
      }
    });

    // Historique complet (sans filtre de date) juste pour connaître les années disponibles.
    effect(() => {
      const friteuseId = this.selectedFriteuseId();
      if (!friteuseId) {
        this.availableYears.set([]);
        return;
      }

      this.changementHuileService.list({ friteuseId }).subscribe((data) => {
        const years = [...new Set(data.map((c) => Number(c.date_changement.slice(0, 4))))].sort((a, b) => b - a);
        this.availableYears.set(years);
        if (years.length > 0 && !years.includes(this.selectedYear())) {
          this.selectedYear.set(years[0]);
        }
      });
    });

    effect(() => {
      const friteuseId = this.selectedFriteuseId();
      const currentPeriod = this.period();
      const month = this.selectedMonth();
      const year = this.selectedYear();
      if (!friteuseId) {
        this.changements.set([]);
        return;
      }

      const { from, to } =
        currentPeriod === 'mois'
          ? monthRange(month)
          : currentPeriod === 'annee'
            ? yearRange(year)
            : { from: rangeStart('semaine'), to: new Date() };

      this.loading.set(true);
      this.changementHuileService
        .list({ friteuseId, from: toIsoDate(from), to: toIsoDate(to) })
        .subscribe((data) => {
          this.changements.set(data);
          this.loading.set(false);
        });
    });
  }

  onFriteuseChange(event: Event): void {
    this.selectedFriteuseId.set(Number((event.target as HTMLSelectElement).value));
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

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  print(): void {
    window.print();
  }
}
