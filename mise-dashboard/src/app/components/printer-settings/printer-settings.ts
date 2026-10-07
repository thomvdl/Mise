import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { SettingService } from '../../core/services/setting.service';

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
// Autorise aussi un nom d'hôte (ex. `host.docker.internal`, le nom spécial que Docker Desktop
// résout vers la machine hôte — utile pour un pont ZPL natif tournant hors Docker sur Windows,
// voir zpl-bridge/README.md) en plus d'une IPv4 classique pour une Zebra réseau.
const HOSTNAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function ipv4OrHostnameValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (!value) return null;
  return IPV4_PATTERN.test(value) || HOSTNAME_PATTERN.test(value) ? null : { ipv4OrHostname: true };
}

interface LabelFormatPreset {
  label: string;
  widthMm: number;
  heightMm: number;
  rotate90: boolean;
  /**
   * Compense une zone morte mécanique propre à l'imprimante (tête/capteur décalés physiquement),
   * mesurée étiquette graduée à l'appui — ~7,5mm constatés en 57x32mm. Pas (encore) mesurée pour
   * 38x89mm pivoté, donc 0 par défaut pour ce format plutôt que de deviner une valeur qui pourrait
   * casser un format qui marchait déjà.
   */
  topOffsetMm: number;
}

/**
 * Préréglages des deux formats de rouleau utilisés en cuisine, pour éviter de ressaisir
 * largeur/hauteur/rotation à la main (et de se tromper) à chaque changement de support.
 */
const LABEL_FORMAT_PRESETS: LabelFormatPreset[] = [
  { label: '38 × 89 mm (pivoté 90°)', widthMm: 38, heightMm: 89, rotate90: true, topOffsetMm: 0 },
  { label: '57 × 32 mm', widthMm: 57, heightMm: 32, rotate90: false, topOffsetMm: 7.5 },
];

@Component({
  selector: 'app-printer-settings',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './printer-settings.html',
  styleUrl: './printer-settings.css',
})
export class PrinterSettings implements OnInit {
  private readonly settingService = inject(SettingService);

  saving = signal(false);
  saved = signal(false);
  errorMessage = signal<string | null>(null);

  readonly labelFormatPresets = LABEL_FORMAT_PRESETS;

  form = new FormGroup({
    printer_ip: new FormControl('', {
      nonNullable: true,
      validators: [ipv4OrHostnameValidator],
    }),
    printer_dpi: new FormControl('203', { nonNullable: true, validators: [Validators.required] }),
    label_width_mm: new FormControl(57, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    label_height_mm: new FormControl(32, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    label_rotate_90: new FormControl(false, { nonNullable: true }),
    label_top_offset_mm: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
  });

  ngOnInit(): void {
    this.settingService.list().subscribe((settings) => {
      const byKey = new Map(settings.map((s) => [s.key, s.value]));

      this.form.patchValue({
        printer_ip: byKey.get('printer_ip') ?? '',
        printer_dpi: byKey.get('printer_dpi') ?? '203',
        label_width_mm: byKey.get('label_width_mm') ? Number(byKey.get('label_width_mm')) : 57,
        label_height_mm: byKey.get('label_height_mm') ? Number(byKey.get('label_height_mm')) : 32,
        label_rotate_90: byKey.get('label_rotate_90') === '1',
        label_top_offset_mm: byKey.get('label_top_offset_mm') ? Number(byKey.get('label_top_offset_mm')) : 0,
      });
    });
  }

  /** Préréglage actif correspondant aux valeurs actuelles du formulaire, s'il y en a un. */
  activePresetLabel(): string {
    const value = this.form.getRawValue();
    const match = this.labelFormatPresets.find(
      (preset) =>
        Number(value.label_width_mm) === preset.widthMm &&
        Number(value.label_height_mm) === preset.heightMm &&
        value.label_rotate_90 === preset.rotate90 &&
        Number(value.label_top_offset_mm) === preset.topOffsetMm,
    );

    return match?.label ?? '';
  }

  /**
   * Remplit largeur/hauteur/rotation depuis un préréglage choisi dans la liste déroulante et
   * enregistre tout de suite — un changement de rouleau ne doit pas dépendre de ne pas oublier de
   * cliquer "Enregistrer" en plus.
   */
  selectPreset(label: string): void {
    const preset = this.labelFormatPresets.find((p) => p.label === label);
    if (!preset) return;

    this.form.patchValue({
      label_width_mm: preset.widthMm,
      label_height_mm: preset.heightMm,
      label_rotate_90: preset.rotate90,
      label_top_offset_mm: preset.topOffsetMm,
    });
    this.save();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.saving.set(true);
    this.saved.set(false);
    this.errorMessage.set(null);

    forkJoin([
      this.settingService.update('printer_ip', value.printer_ip.trim() || null),
      this.settingService.update('printer_dpi', value.printer_dpi),
      this.settingService.update('label_width_mm', String(value.label_width_mm)),
      this.settingService.update('label_height_mm', String(value.label_height_mm)),
      this.settingService.update('label_rotate_90', value.label_rotate_90 ? '1' : '0'),
      this.settingService.update('label_top_offset_mm', String(value.label_top_offset_mm)),
    ]).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
