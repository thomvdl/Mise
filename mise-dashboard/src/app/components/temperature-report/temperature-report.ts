import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';

import { AppareilService } from '../../core/services/appareil.service';
import { TemperatureReleve } from '../../core/models/temperature-releve.model';
import { TemperatureReleveService } from '../../core/services/temperature-releve.service';
import { TemperatureChart, TemperaturePoint } from '../temperature-chart/temperature-chart';
import { todayDDMMYYYY, useReportTitle } from '../../core/utils/report-title';

type Period = 'semaine' | 'mois' | 'annee';

// 'mois' and 'annee' have no static label — periodLabel() derives them from the selected month/year instead.
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

/** Bornes (premier jour / dernier jour) du mois calendaire sélectionné, format "YYYY-MM". */
function monthRange(monthIso: string): { from: Date; to: Date } {
  const [year, month] = monthIso.split('-').map(Number);
  return { from: new Date(year, month - 1, 1), to: new Date(year, month, 0) };
}

/** Bornes (1er janvier / 31 décembre) de l'année calendaire sélectionnée. */
function yearRange(year: number): { from: Date; to: Date } {
  return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
}

function rangeStart(period: 'semaine'): Date {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date;
}

@Component({
  selector: 'app-temperature-report',
  imports: [TemperatureChart],
  templateUrl: './temperature-report.html',
  styleUrl: './temperature-report.css',
})
export class TemperatureReport {
  private readonly appareilService = inject(AppareilService);
  private readonly temperatureReleveService = inject(TemperatureReleveService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  readonly periods: { key: Period; label: string }[] = [
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois', label: 'Mois' },
    { key: 'annee', label: 'Année' },
  ];

  readonly maxMonth = currentMonthIso();

  appareils = toSignal(this.appareilService.list(), { initialValue: [] });
  selectedAppareilId = signal<number | null>(null);
  period = signal<Period>('semaine');
  selectedMonth = signal<string>(currentMonthIso());
  selectedYear = signal<number>(new Date().getFullYear());
  /** Toutes les années pour lesquelles cet appareil a au moins un relevé, les plus récentes en premier. */
  availableYears = signal<number[]>([]);
  releves = signal<TemperatureReleve[]>([]);
  loading = signal(false);

  selectedAppareil = computed(() => this.appareils().find((a) => a.id === this.selectedAppareilId()) ?? null);

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

  chartPoints = computed<TemperaturePoint[]>(() =>
    this.releves().map((r) => ({ date: new Date(r.recorded_at), temperature: r.temperature })),
  );

  formatDate = computed(() => {
    const options: Intl.DateTimeFormatOptions =
      this.period() === 'annee' ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: '2-digit' };
    return (date: Date) => date.toLocaleDateString('fr-FR', options);
  });

  stats = computed(() => {
    const temps = this.releves().map((r) => r.temperature);
    if (temps.length === 0) return null;

    return {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((sum, t) => sum + t, 0) / temps.length,
    };
  });

  outOfRangeCount = computed(() => this.releves().filter((r) => this.isOutOfRange(r.temperature)).length);

  isOutOfRange(temperature: number): boolean {
    const appareil = this.selectedAppareil();
    if (!appareil) return false;
    return (
      (appareil.temperature_min !== null && temperature < appareil.temperature_min) ||
      (appareil.temperature_max !== null && temperature > appareil.temperature_max)
    );
  }

  constructor() {
    effect(() => {
      const appareil = this.selectedAppareil();
      this.setReportTitle(
        appareil ? `Rapport température — ${appareil.name} — ${todayDDMMYYYY()}` : 'Rapport température',
      );
    });

    effect(() => {
      const list = this.appareils();
      if (list.length > 0 && this.selectedAppareilId() === null) {
        this.selectedAppareilId.set(list[0].id);
      }
    });

    // Fetches this appareil's full history (no date filter) just to know which years have data,
    // so the year picker only ever offers years that actually exist — separate from the
    // period-filtered fetch below, which drives the chart/table for the currently viewed range.
    effect(() => {
      const appareilId = this.selectedAppareilId();
      if (!appareilId) {
        this.availableYears.set([]);
        return;
      }

      this.temperatureReleveService.list({ appareilId }).subscribe((data) => {
        const years = [...new Set(data.map((r) => new Date(r.recorded_at).getFullYear()))].sort((a, b) => b - a);
        this.availableYears.set(years);
        if (years.length > 0 && !years.includes(this.selectedYear())) {
          this.selectedYear.set(years[0]);
        }
      });
    });

    effect(() => {
      const appareilId = this.selectedAppareilId();
      const currentPeriod = this.period();
      const month = this.selectedMonth();
      const year = this.selectedYear();
      if (!appareilId) {
        this.releves.set([]);
        return;
      }

      const { from, to } =
        currentPeriod === 'mois'
          ? monthRange(month)
          : currentPeriod === 'annee'
            ? yearRange(year)
            : { from: rangeStart('semaine'), to: new Date() };

      this.loading.set(true);
      this.temperatureReleveService
        .list({ appareilId, from: toIsoDate(from), to: toIsoDate(to) })
        .subscribe((data) => {
          this.releves.set(data);
          this.loading.set(false);
        });
    });
  }

  onAppareilChange(event: Event): void {
    this.selectedAppareilId.set(Number((event.target as HTMLSelectElement).value));
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

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  print(): void {
    window.print();
  }
}
