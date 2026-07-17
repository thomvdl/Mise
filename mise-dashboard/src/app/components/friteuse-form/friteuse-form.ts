import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FriteuseService } from '../../core/services/friteuse.service';

@Component({
  selector: 'app-friteuse-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './friteuse-form.html',
  styleUrl: './friteuse-form.css',
})
export class FriteuseForm implements OnInit {
  private readonly friteuseService = inject(FriteuseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  editingId = signal<number | null>(null);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  isEdit = computed(() => this.editingId() !== null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    duree_vie_jours: new FormControl<number | null>(14, { validators: [Validators.required, Validators.min(1)] }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editingId.set(id);
      this.friteuseService.get(id).subscribe((friteuse) => {
        this.form.patchValue({ name: friteuse.name, duree_vie_jours: friteuse.duree_vie_jours });
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = { name: value.name, duree_vie_jours: value.duree_vie_jours! };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.isEdit()
      ? this.friteuseService.update(this.editingId()!, payload)
      : this.friteuseService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
