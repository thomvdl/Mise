import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AppareilService } from '../../core/services/appareil.service';

@Component({
  selector: 'app-appareil-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './appareil-form.html',
  styleUrl: './appareil-form.css',
})
export class AppareilForm implements OnInit {
  private readonly appareilService = inject(AppareilService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  editingId = signal<number | null>(null);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  isEdit = computed(() => this.editingId() !== null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    abbreviation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fonction: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    temperature_min: new FormControl<number | null>(null),
    temperature_max: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    const revalidateRange = () => {
      const { temperature_min, temperature_max } = this.form.controls;
      const hasRangeError = temperature_min.value !== null && temperature_max.value !== null && temperature_max.value < temperature_min.value;
      temperature_max.setErrors(hasRangeError ? { range: true } : null);
    };
    this.form.controls.temperature_min.valueChanges.subscribe(revalidateRange);
    this.form.controls.temperature_max.valueChanges.subscribe(revalidateRange);

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editingId.set(id);
      this.appareilService.get(id).subscribe((appareil) => {
        this.form.patchValue({
          name: appareil.name,
          abbreviation: appareil.abbreviation,
          fonction: appareil.fonction,
          temperature_min: appareil.temperature_min,
          temperature_max: appareil.temperature_max,
        });
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.isEdit()
      ? this.appareilService.update(this.editingId()!, payload)
      : this.appareilService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
