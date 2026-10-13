import { Component, computed, input, signal } from '@angular/core';

import { TemperaturePoint } from '../temperature-chart/temperature-chart';

export interface TemperatureSeries {
  id: number;
  name: string;
  /** Position fixe de l'appareil dans la liste complète (0-based) — la couleur suit l'appareil,
   *  jamais son rang parmi les séries affichées. Doit être < MAX_SERIES. */
  colorIndex: number;
  /** Triés par date croissante (l'API les renvoie déjà dans cet ordre). */
  points: TemperaturePoint[];
}

/** Nombre de couleurs de la palette (voir --series-N dans le CSS) — le rouge en est exclu, réservé
 *  aux relevés hors plage. Au-delà, le parent ne passe pas l'appareil à ce graphique commun. */
export const MAX_SERIES = 7;
/** Jusqu'à ce nombre de séries, chaque courbe porte aussi son nom en bout de ligne. */
const DIRECT_LABEL_MAX = 4;

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };
const LABEL_GUTTER = 96;
const LABEL_MIN_GAP = 12;

/**
 * Toutes les courbes sur un même graphique — vue d'ensemble du mode "Tous" du rapport de
 * température. Contrairement à TemperatureChart (points espacés par rang), l'axe X est ici
 * proportionnel au temps : c'est la seule façon d'aligner des appareils relevés à des moments
 * différents. Pas de plages normales ici (une par appareil, illisibles superposées) : elles
 * restent sur les graphiques individuels affichés en dessous.
 */
@Component({
  selector: 'app-temperature-multi-chart',
  imports: [],
  templateUrl: './temperature-multi-chart.html',
  styleUrl: './temperature-multi-chart.css',
})
export class TemperatureMultiChart {
  series = input<TemperatureSeries[]>([]);
  formatDate = input<(date: Date) => string>((date) => date.toLocaleDateString('fr-FR'));

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly plotLeft = PADDING.left;
  readonly plotTop = PADDING.top;
  readonly plotBottom = HEIGHT - PADDING.bottom;

  hoverTime = signal<number | null>(null);

  readonly visibleSeries = computed(() => this.series().filter((s) => s.points.length > 0));

  readonly directLabels = computed(() => this.visibleSeries().length <= DIRECT_LABEL_MAX);

  readonly plotRight = computed(() => WIDTH - PADDING.right - (this.directLabels() ? LABEL_GUTTER : 0));

  private readonly domain = computed(() => {
    const all = this.visibleSeries().flatMap((s) => s.points);
    if (all.length === 0) return null;

    const times = all.map((p) => p.date.getTime());
    const temps = all.map((p) => p.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    // At least 1°C of headroom so a flat series doesn't collapse to a single line.
    const tempPad = Math.max((maxTemp - minTemp) * 0.1, 1);

    return {
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      minTemp: minTemp - tempPad,
      maxTemp: maxTemp + tempPad,
    };
  });

  private readonly xScale = computed(() => {
    const domain = this.domain();
    if (!domain) return null;

    const { minTime, maxTime } = domain;
    const left = this.plotLeft;
    const right = this.plotRight();
    return (t: number) => (maxTime === minTime ? (left + right) / 2 : left + ((t - minTime) / (maxTime - minTime)) * (right - left));
  });

  private readonly yScale = computed(() => {
    const domain = this.domain();
    if (!domain) return null;

    const { minTemp, maxTemp } = domain;
    return (v: number) => this.plotBottom - ((v - minTemp) / (maxTemp - minTemp)) * (this.plotBottom - this.plotTop);
  });

  readonly lines = computed(() => {
    const xScale = this.xScale();
    const yScale = this.yScale();
    if (!xScale || !yScale) return [];

    return this.visibleSeries().map((s) => {
      const coords = s.points.map((p) => ({ x: xScale(p.date.getTime()), y: yScale(p.temperature) }));
      return {
        series: s,
        color: `var(--series-${s.colorIndex + 1})`,
        path: coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' '),
        end: coords[coords.length - 1],
      };
    });
  });

  /** Noms en bout de courbe, écartés verticalement quand deux appareils finissent à des
   *  températures proches (deux frigos à 3 et 4°C) pour que les étiquettes ne se chevauchent pas. */
  readonly endLabels = computed(() => {
    if (!this.directLabels()) return [];

    const labels = this.lines()
      .map((line) => ({ name: line.series.name, color: line.color, x: line.end.x + 8, y: line.end.y }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) {
      labels[i].y = Math.max(labels[i].y, labels[i - 1].y + LABEL_MIN_GAP);
    }
    return labels;
  });

  readonly yTicks = computed(() => {
    const domain = this.domain();
    if (!domain) return [];

    const { minTemp, maxTemp } = domain;
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = minTemp + ((maxTemp - minTemp) * i) / steps;
      const y = this.plotBottom - (i / steps) * (this.plotBottom - this.plotTop);
      return { value, y };
    });
  });

  readonly xTicks = computed(() => {
    const domain = this.domain();
    const xScale = this.xScale();
    if (!domain || !xScale) return [];

    const { minTime, maxTime } = domain;
    const count = maxTime === minTime ? 1 : 5;
    return Array.from({ length: count }, (_, i) => {
      const time = count === 1 ? minTime : minTime + ((maxTime - minTime) * i) / (count - 1);
      return { time, x: xScale(time), label: this.formatDate()(new Date(time)) };
    });
  });

  /** Relevé le plus proche de l'instant survolé, pour chaque appareil — sauf s'il est trop loin
   *  dans le temps (un appareil sans relevé ce jour-là ne doit pas afficher la valeur d'hier). */
  readonly hovered = computed(() => {
    const time = this.hoverTime();
    const domain = this.domain();
    const xScale = this.xScale();
    const yScale = this.yScale();
    if (time === null || !domain || !xScale || !yScale) return null;

    const tolerance = Math.max((domain.maxTime - domain.minTime) * 0.03, 60 * 60 * 1000);
    const rows = this.visibleSeries()
      .map((s) => {
        const point = nearestPoint(s.points, time);
        if (!point || Math.abs(point.date.getTime() - time) > tolerance) return null;
        return {
          series: s,
          color: `var(--series-${s.colorIndex + 1})`,
          point,
          x: xScale(point.date.getTime()),
          y: yScale(point.temperature),
        };
      })
      .filter((row) => row !== null);

    return { x: xScale(time), date: new Date(time), rows };
  });

  onMove(event: MouseEvent, svg: SVGSVGElement): void {
    const domain = this.domain();
    if (!domain) return;

    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * this.width;
    const left = this.plotLeft;
    const right = this.plotRight();
    const ratio = Math.min(Math.max((x - left) / (right - left), 0), 1);
    this.hoverTime.set(domain.minTime + ratio * (domain.maxTime - domain.minTime));
  }

  onLeave(): void {
    this.hoverTime.set(null);
  }

  formatTemp(value: number): string {
    return `${value.toFixed(1)}°C`;
  }
}

/** Recherche dichotomique dans des points triés par date. */
function nearestPoint(points: TemperaturePoint[], time: number): TemperaturePoint | null {
  if (points.length === 0) return null;

  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].date.getTime() < time) lo = mid + 1;
    else hi = mid;
  }
  const after = points[lo];
  const before = points[lo - 1];
  if (!before) return after;
  return Math.abs(before.date.getTime() - time) <= Math.abs(after.date.getTime() - time) ? before : after;
}
