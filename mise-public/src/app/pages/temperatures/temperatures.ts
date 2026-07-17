import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { Appareil } from '../../core/models/appareil.model';
import { AppareilService } from '../../core/services/appareil.service';
import { TemperatureReleveService } from '../../core/services/temperature-releve.service';

@Component({
  selector: 'app-temperatures',
  imports: [],
  templateUrl: './temperatures.html',
  styleUrl: './temperatures.css',
})
export class Temperatures {
  private readonly appareilService = inject(AppareilService);
  private readonly temperatureReleveService = inject(TemperatureReleveService);

  appareils = toSignal(this.appareilService.list(), { initialValue: [] });

  /** Valeur saisie par appareil (texte brut, avant parsing) — absente tant que rien n'est relevé. */
  values = signal<Partial<Record<number, string>>>({});

  saving = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  filledCount = computed(() => Object.values(this.values()).filter((v) => (v ?? '').trim() !== '').length);
  canSave = computed(() => this.filledCount() > 0 && !this.saving());

  onValueInput(appareilId: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.values.update((values) => ({ ...values, [appareilId]: value }));
    this.successMessage.set(null);
  }

  rangeLabel(appareil: Appareil): string | null {
    if (appareil.temperature_min === null && appareil.temperature_max === null) return null;
    return `Plage normale : ${appareil.temperature_min ?? '…'}°C à ${appareil.temperature_max ?? '…'}°C`;
  }

  isOutOfRange(appareil: Appareil): boolean {
    const raw = this.values()[appareil.id];
    if (!raw || raw.trim() === '') return false;

    const value = parseFloat(raw);
    if (Number.isNaN(value)) return false;

    return (
      (appareil.temperature_min !== null && value < appareil.temperature_min) ||
      (appareil.temperature_max !== null && value > appareil.temperature_max)
    );
  }

  save(): void {
    const entries = Object.entries(this.values())
      .map(([id, value]) => ({ appareilId: Number(id), temperature: parseFloat(value ?? '') }))
      .filter((entry) => !Number.isNaN(entry.temperature));

    if (entries.length === 0) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    forkJoin(
      entries.map((entry) =>
        this.temperatureReleveService.create({ appareil_id: entry.appareilId, temperature: entry.temperature }),
      ),
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.values.set({});
        this.successMessage.set(
          entries.length > 1 ? `${entries.length} relevés enregistrés.` : '1 relevé enregistré.',
        );
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement. Vérifiez la connexion.");
      },
    });
  }
}
