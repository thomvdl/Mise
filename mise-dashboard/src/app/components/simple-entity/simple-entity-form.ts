import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SimpleEntityConfig } from '../../core/config/simple-entity.config';
import { SimpleEntity } from '../../core/models/simple-entity.model';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { slugify } from '../../core/utils/slugify';
import { ColorPicker, COLOR_PALETTE } from '../color-picker/color-picker';

@Component({
  selector: 'app-simple-entity-form',
  imports: [ReactiveFormsModule, RouterLink, ColorPicker],
  templateUrl: './simple-entity-form.html',
  styleUrl: './simple-entity-form.css',
})
export class SimpleEntityForm implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private service!: SimpleEntityService;

  config = input.required<SimpleEntityConfig>();

  editingId = signal<number | null>(null);
  slugTouched = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  isEdit = computed(() => this.editingId() !== null);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    code: [''],
    color: [COLOR_PALETTE[0]],
  });

  ngOnInit(): void {
    this.service = new SimpleEntityService(this.http, this.config().resource);

    if (!this.hasField('code')) {
      this.form.controls.code.disable();
    }

    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugTouched()) {
        this.form.controls.slug.setValue(slugify(name), { emitEvent: false });
      }
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editingId.set(id);
      this.slugTouched.set(true);
      this.service.get(id).subscribe((entity) => {
        this.form.patchValue({
          name: entity.name,
          slug: entity.slug,
          code: entity.code ?? '',
          color: entity.color ?? COLOR_PALETTE[0],
        });
      });
    }
  }

  hasField(key: string): boolean {
    return this.config().fields.some((field) => field.key === key);
  }

  onSlugInput(): void {
    this.slugTouched.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: Partial<SimpleEntity> = {
      name: value.name,
      slug: value.slug,
      color: value.color || null,
    };

    if (this.hasField('code')) {
      payload.code = value.code;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.isEdit()
      ? this.service.update(this.editingId()!, payload)
      : this.service.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
