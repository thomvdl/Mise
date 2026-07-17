import { Component, computed, input, signal } from '@angular/core';

export interface TemperaturePoint {
  date: Date;
  temperature: number;
}

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

@Component({
  selector: 'app-temperature-chart',
  imports: [],
  templateUrl: './temperature-chart.html',
  styleUrl: './temperature-chart.css',
})
export class TemperatureChart {
  points = input<TemperaturePoint[]>([]);
  /** Format applied to x-axis tick labels and the hover tooltip date — adapts to the selected period (jour/mois/année). */
  formatDate = input<(date: Date) => string>((date) => date.toLocaleDateString('fr-FR'));
  /** Plage normale de l'appareil, si définie — dessine des repères et marque les relevés hors plage. */
  temperatureMin = input<number | null>(null);
  temperatureMax = input<number | null>(null);

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly plotLeft = PADDING.left;
  readonly plotRight = WIDTH - PADDING.right;
  readonly plotTop = PADDING.top;
  readonly plotBottom = HEIGHT - PADDING.bottom;

  hoverIndex = signal<number | null>(null);

  private readonly domain = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return null;

    const temps = pts.map((p) => p.temperature);
    const min = this.temperatureMin();
    const max = this.temperatureMax();
    if (min !== null) temps.push(min);
    if (max !== null) temps.push(max);

    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    // At least 1°C of headroom so a flat series doesn't collapse to a single line.
    const tempPad = Math.max((maxTemp - minTemp) * 0.15, 1);

    return {
      minTemp: minTemp - tempPad,
      maxTemp: maxTemp + tempPad,
    };
  });

  private readonly yScale = computed(() => {
    const domain = this.domain();
    if (!domain) return null;

    const { minTemp, maxTemp } = domain;
    return (v: number) => this.plotBottom - ((v - minTemp) / (maxTemp - minTemp)) * (this.plotBottom - this.plotTop);
  });

  readonly scaled = computed(() => {
    const domain = this.domain();
    const yScale = this.yScale();
    const pts = this.points();
    if (!domain || !yScale || pts.length === 0) return [];

    const min = this.temperatureMin();
    const max = this.temperatureMax();
    // Evenly spaced by rank rather than proportional to elapsed time — a chart where
    // several readings on one day are followed by a long gap should still read cleanly,
    // not squash a cluster of points together and stretch the rest across empty space.
    const n = pts.length;
    const xScale = (i: number) =>
      n === 1 ? (this.plotLeft + this.plotRight) / 2 : this.plotLeft + (i / (n - 1)) * (this.plotRight - this.plotLeft);

    return pts.map((p, i) => ({
      x: xScale(i),
      y: yScale(p.temperature),
      outOfRange: (min !== null && p.temperature < min) || (max !== null && p.temperature > max),
      point: p,
    }));
  });

  readonly thresholdLines = computed(() => {
    const yScale = this.yScale();
    if (!yScale) return [];

    return [
      { value: this.temperatureMin(), y: this.temperatureMin() !== null ? yScale(this.temperatureMin()!) : null },
      { value: this.temperatureMax(), y: this.temperatureMax() !== null ? yScale(this.temperatureMax()!) : null },
    ].filter((line): line is { value: number; y: number } => line.value !== null && line.y !== null);
  });

  readonly linePath = computed(() =>
    this.scaled()
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' '),
  );

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
    const scaled = this.scaled();
    if (scaled.length === 0) return [];

    const count = Math.min(scaled.length, 5);
    const step = (scaled.length - 1) / Math.max(count - 1, 1);
    return Array.from({ length: count }, (_, i) => scaled[Math.round(i * step)]);
  });

  readonly hovered = computed(() => {
    const index = this.hoverIndex();
    if (index === null) return null;
    return this.scaled()[index] ?? null;
  });

  onMove(event: MouseEvent, svg: SVGSVGElement): void {
    const scaled = this.scaled();
    if (scaled.length === 0) return;

    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * this.width;

    let nearest = 0;
    let nearestDist = Infinity;
    scaled.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    this.hoverIndex.set(nearest);
  }

  onLeave(): void {
    this.hoverIndex.set(null);
  }

  formatTemp(value: number): string {
    return `${value.toFixed(1)}°C`;
  }
}
