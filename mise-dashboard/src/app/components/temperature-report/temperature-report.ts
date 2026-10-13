import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';

import { Appareil } from '../../core/models/appareil.model';
import { AppareilService } from '../../core/services/appareil.service';
import { TemperatureReleve } from '../../core/models/temperature-releve.model';
import { TemperatureReleveService } from '../../core/services/temperature-releve.service';
import { TemperatureChart, TemperaturePoint } from '../temperature-chart/temperature-chart';
import { MAX_SERIES, TemperatureMultiChart, TemperatureSeries } from '../temperature-multi-chart/temperature-multi-chart';
import { todayDDMMYYYY, useReportTitle } from '../../core/utils/report-title';

type Period = 'semaine' | 'mois' | 'annee';

/** Valeur du sélecteur d'appareil pour le rapport complet, tous appareils confondus. */
const ALL = 'all';
type AppareilSelection = number | typeof ALL;

// 'mois' and 'annee' have no static label — periodLabel() derives them from the selected month/year instead.
const PERIOD_LABELS: Record<Period, string> = {
  semaine: '7 derniers jours',
  mois: '',
  annee: '',
};

interface TemperatureStats {
  min: number;
  max: number;
  avg: number;
}

/** Synthèse d'un appareil pour le mode "Tous" : tableau récapitulatif + graphique individuel. */
interface AppareilGroup {
  appareil: Appareil;
  /** Position dans la liste complète des appareils — fixe la couleur de sa courbe. */
  colorIndex: number;
  releves: TemperatureReleve[];
  points: TemperaturePoint[];
  stats: TemperatureStats | null;
  outOfRangeCount: number;
}

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

function computeStats(releves: TemperatureReleve[]): TemperatureStats | null {
  const temps = releves.map((r) => r.temperature);
  if (temps.length === 0) return null;

  return {
    min: Math.min(...temps),
    max: Math.max(...temps),
    avg: temps.reduce((sum, t) => sum + t, 0) / temps.length,
  };
}

function isOutOfRangeFor(appareil: Appareil, temperature: number): boolean {
  return (
    (appareil.temperature_min !== null && temperature < appareil.temperature_min) ||
    (appareil.temperature_max !== null && temperature > appareil.temperature_max)
  );
}

function toPoints(releves: TemperatureReleve[]): TemperaturePoint[] {
  return releves.map((r) => ({ date: new Date(r.recorded_at), temperature: r.temperature }));
}

@Component({
  selector: 'app-temperature-report',
  imports: [TemperatureChart, TemperatureMultiChart],
  templateUrl: './temperature-report.html',
  styleUrl: './temperature-report.css',
})
export class TemperatureReport {
  private readonly appareilService = inject(AppareilService);
  private readonly temperatureReleveService = inject(TemperatureReleveService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  readonly ALL = ALL;
  readonly maxSeries = MAX_SERIES;

  readonly periods: { key: Period; label: string }[] = [
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois', label: 'Mois' },
    { key: 'annee', label: 'Année' },
  ];

  readonly maxMonth = currentMonthIso();

  appareils = toSignal(this.appareilService.list(), { initialValue: [] });
  selectedAppareilId = signal<AppareilSelection | null>(null);
  period = signal<Period>('semaine');
  selectedMonth = signal<string>(currentMonthIso());
  selectedYear = signal<number>(new Date().getFullYear());
  /** Toutes les années pour lesquelles cet appareil (ou n'importe lequel, en mode "Tous") a au moins un relevé, les plus récentes en premier. */
  availableYears = signal<number[]>([]);
  releves = signal<TemperatureReleve[]>([]);
  loading = signal(false);

  newTemperature = signal('');
  savingReading = signal(false);
  readingError = signal<string | null>(null);
  readingSuccess = signal<string | null>(null);

  isAll = computed(() => this.selectedAppareilId() === ALL);

  canAddReading = computed(() => {
    const value = parseFloat(this.newTemperature());
    return this.selectedAppareil() !== null && !Number.isNaN(value) && !this.savingReading();
  });

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

  chartPoints = computed<TemperaturePoint[]>(() => toPoints(this.releves()));

  formatDate = computed(() => {
    const options: Intl.DateTimeFormatOptions =
      this.period() === 'annee' ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: '2-digit' };
    return (date: Date) => date.toLocaleDateString('fr-FR', options);
  });

  stats = computed(() => computeStats(this.releves()));

  outOfRangeCount = computed(() => this.releves().filter((r) => this.isOutOfRange(r.temperature)).length);

  /** Mode "Tous" : un groupe par appareil, y compris ceux sans relevé sur la période — en HACCP,
   *  un appareil qui n'a pas été relevé est en soi une information à faire apparaître. */
  groups = computed<AppareilGroup[]>(() => {
    if (!this.isAll()) return [];

    const byAppareil = new Map<number, TemperatureReleve[]>();
    for (const releve of this.releves()) {
      const list = byAppareil.get(releve.appareil_id) ?? [];
      list.push(releve);
      byAppareil.set(releve.appareil_id, list);
    }

    return this.appareils().map((appareil, colorIndex) => {
      const releves = byAppareil.get(appareil.id) ?? [];
      return {
        appareil,
        colorIndex,
        releves,
        points: toPoints(releves),
        stats: computeStats(releves),
        outOfRangeCount: releves.filter((r) => isOutOfRangeFor(appareil, r.temperature)).length,
      };
    });
  });

  /** Courbes du graphique commun — limitées aux MAX_SERIES premiers appareils (au-delà, plus assez
   *  de couleurs distinctes) ; les suivants restent dans leurs graphiques individuels. */
  multiSeries = computed<TemperatureSeries[]>(() =>
    this.groups()
      .filter((g) => g.colorIndex < MAX_SERIES)
      .map((g) => ({ id: g.appareil.id, name: g.appareil.name, colorIndex: g.colorIndex, points: g.points })),
  );

  /** Mode "Tous" : seulement les relevés hors plage, tous appareils confondus, par date. */
  outOfRangeReleves = computed(() =>
    this.groups()
      .flatMap((g) =>
        g.releves.filter((r) => isOutOfRangeFor(g.appareil, r.temperature)).map((releve) => ({ releve, appareil: g.appareil })),
      )
      .sort((a, b) => a.releve.recorded_at.localeCompare(b.releve.recorded_at)),
  );

  isOutOfRange(temperature: number): boolean {
    const appareil = this.selectedAppareil();
    return appareil !== null && isOutOfRangeFor(appareil, temperature);
  }

  constructor() {
    effect(() => {
      const appareil = this.selectedAppareil();
      this.setReportTitle(
        this.isAll()
          ? `Rapport température — Tous les appareils — ${todayDDMMYYYY()}`
          : appareil
            ? `Rapport température — ${appareil.name} — ${todayDDMMYYYY()}`
            : 'Rapport température',
      );
    });

    effect(() => {
      // Vue "Tous les appareils" par défaut — sauf s'il n'y en a qu'un (l'option n'est alors pas proposée).
      const list = this.appareils();
      if (list.length > 0 && this.selectedAppareilId() === null) {
        this.selectedAppareilId.set(list.length > 1 ? ALL : list[0].id);
      }
    });

    // Fetches the full history (no date filter) just to know which years have data,
    // so the year picker only ever offers years that actually exist — separate from the
    // period-filtered fetch below, which drives the chart/table for the currently viewed range.
    effect(() => {
      const selection = this.selectedAppareilId();
      if (selection === null) {
        this.availableYears.set([]);
        return;
      }

      this.temperatureReleveService.list({ appareilId: selection === ALL ? undefined : selection }).subscribe((data) => {
        const years = [...new Set(data.map((r) => new Date(r.recorded_at).getFullYear()))].sort((a, b) => b - a);
        this.availableYears.set(years);
        if (years.length > 0 && !years.includes(this.selectedYear())) {
          this.selectedYear.set(years[0]);
        }
      });
    });

    effect(() => {
      this.loadReleves();
    });
  }

  private loadReleves(): void {
    const selection = this.selectedAppareilId();
    const currentPeriod = this.period();
    const month = this.selectedMonth();
    const year = this.selectedYear();
    if (selection === null) {
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
      .list({ appareilId: selection === ALL ? undefined : selection, from: toIsoDate(from), to: toIsoDate(to) })
      .subscribe((data) => {
        this.releves.set(data);
        this.loading.set(false);
      });
  }

  onNewTemperatureInput(event: Event): void {
    this.newTemperature.set((event.target as HTMLInputElement).value);
    this.readingSuccess.set(null);
  }

  addReading(): void {
    const appareil = this.selectedAppareil();
    const temperature = parseFloat(this.newTemperature());
    if (appareil === null || Number.isNaN(temperature)) return;

    this.savingReading.set(true);
    this.readingError.set(null);
    this.readingSuccess.set(null);

    this.temperatureReleveService.create({ appareil_id: appareil.id, temperature }).subscribe({
      next: () => {
        this.savingReading.set(false);
        this.newTemperature.set('');
        this.readingSuccess.set('Relevé enregistré.');
        this.loadReleves();
      },
      error: () => {
        this.savingReading.set(false);
        this.readingError.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }

  onAppareilChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedAppareilId.set(value === ALL ? ALL : Number(value));
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

  formatRange(appareil: Appareil): string {
    if (appareil.temperature_min === null && appareil.temperature_max === null) return '—';
    return `${appareil.temperature_min ?? '…'}°C – ${appareil.temperature_max ?? '…'}°C`;
  }

  print(): void {
    window.print();
  }
}
