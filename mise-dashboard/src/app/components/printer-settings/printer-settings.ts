import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
  });

  ngOnInit(): void {
    this.settingService.list().subscribe((settings) => {
      const printerIp = settings.find((s) => s.key === 'printer_ip')?.value;
      if (printerIp) this.form.patchValue({ printer_ip: printerIp });
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue().printer_ip.trim();

    this.saving.set(true);
    this.saved.set(false);
    this.errorMessage.set(null);

    this.settingService.update('printer_ip', value || null).subscribe({
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
