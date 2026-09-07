import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { SettingService } from '../../core/services/setting.service';

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

@Component({
  selector: 'app-printer-settings',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './printer-settings.html',
  styleUrl: './printer-settings.css',
})
export class PrinterSettings implements OnInit {
  private readonly settingService = inject(SettingService);

  saving = signal(false);
  saved = signal(false);
  errorMessage = signal<string | null>(null);

  form = new FormGroup({
    printer_ip: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(IPV4_PATTERN)],
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
  });

  ngOnInit(): void {
    this.settingService.list().subscribe((settings) => {
      const byKey = new Map(settings.map((s) => [s.key, s.value]));

      this.form.patchValue({
        printer_ip: byKey.get('printer_ip') ?? '',
        printer_dpi: byKey.get('printer_dpi') ?? '203',
        label_width_mm: byKey.get('label_width_mm') ? Number(byKey.get('label_width_mm')) : 57,
        label_height_mm: byKey.get('label_height_mm') ? Number(byKey.get('label_height_mm')) : 32,
      });
    });
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
