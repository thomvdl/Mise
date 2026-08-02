import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { LABEL_TYPE_TITLES, PrintedLabel } from '../../core/models/printed-label.model';
import { PrintedLabelService } from '../../core/services/printed-label.service';
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
  selector: 'app-printed-label-report',
  imports: [],
  templateUrl: './printed-label-report.html',
  styleUrl: './printed-label-report.css',
})
export class PrintedLabelReport {
  private readonly printedLabelService = inject(PrintedLabelService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  readonly periods: { key: Period; label: string }[] = [
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois', label: 'Mois' },
    { key: 'annee', label: 'Année' },
  ];

  readonly labelTypeTitles = LABEL_TYPE_TITLES;
  readonly labelTypeKeys = Object.keys(LABEL_TYPE_TITLES);
  readonly maxMonth = currentMonthIso();

  selectedTypeKey = signal<string>('');
  period = signal<Period>('semaine');
  selectedMonth = signal<string>(currentMonthIso());
  selectedYear = signal<number>(new Date().getFullYear());
  /** Toutes les années pour lesquelles au moins une étiquette a été imprimée, les plus récentes en premier. */
  availableYears = signal<number[]>([]);
  labels = signal<PrintedLabel[]>([]);
  loading = signal(false);

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

  totalCount = computed(() => this.labels().reduce((sum, l) => sum + l.quantity, 0));

  constructor() {
    effect(() => {
      const typeKey = this.selectedTypeKey();
      const label = typeKey ? `Historique étiquettes — ${this.typeTitle(typeKey)}` : 'Historique étiquettes';
      this.setReportTitle(`${label} — ${todayDDMMYYYY()}`);
    });

    // Récupère tout l'historique (sans filtre de date) juste pour savoir quelles années ont des
    // données, pour que le sélecteur d'année ne propose que des années qui existent réellement —
    // séparé du fetch filtré par période plus bas, qui alimente le tableau affiché.
    effect(() => {
      const typeKey = this.selectedTypeKey();
      this.printedLabelService.list({ typeKey: typeKey || undefined }).subscribe((data) => {
        const years = [...new Set(data.map((l) => new Date(l.created_at).getFullYear()))].sort((a, b) => b - a);
        this.availableYears.set(years);
        if (years.length > 0 && !years.includes(this.selectedYear())) {
          this.selectedYear.set(years[0]);
        }
      });
    });

    effect(() => {
      const typeKey = this.selectedTypeKey();
      const currentPeriod = this.period();
      const month = this.selectedMonth();
      const year = this.selectedYear();

      const { from, to } =
        currentPeriod === 'mois'
          ? monthRange(month)
          : currentPeriod === 'annee'
            ? yearRange(year)
            : { from: rangeStart('semaine'), to: new Date() };

      this.loading.set(true);
      this.printedLabelService
        .list({ typeKey: typeKey || undefined, from: toIsoDate(from), to: toIsoDate(to) })
        .subscribe((data) => {
          this.labels.set(data);
          this.loading.set(false);
        });
    });
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

  onTypeChange(event: Event): void {
    this.selectedTypeKey.set((event.target as HTMLSelectElement).value);
  }

  typeTitle(typeKey: string): string {
    return this.labelTypeTitles[typeKey] ?? typeKey;
  }

  printedViaLabel(via: string): string {
    return via === 'brother_ql' ? 'Brother QL' : 'Navigateur';
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
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
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
