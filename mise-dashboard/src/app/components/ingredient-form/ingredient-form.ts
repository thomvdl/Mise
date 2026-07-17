import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { IngredientService } from '../../core/services/ingredient.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { IngredientCategory } from '../../core/models/ingredient-category.model';
import { Allergen } from '../../core/models/allergen.model';
import { IngredientPayload } from '../../core/models/ingredient.model';
import { slugify } from '../../core/utils/slugify';

@Component({
  selector: 'app-ingredient-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './ingredient-form.html',
  styleUrl: './ingredient-form.css',
})
export class IngredientForm implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly ingredientService = inject(IngredientService);
  private readonly categoryService = new SimpleEntityService<IngredientCategory>(this.http, 'ingredient-categories');
  private readonly allergenService = new SimpleEntityService<Allergen>(this.http, 'allergens');
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  editingId = signal<number | null>(null);
  slugTouched = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  categories = signal<IngredientCategory[]>([]);
  allergens = signal<Allergen[]>([]);
  selectedAllergenIds = signal<Set<number>>(new Set());

  isEdit = computed(() => this.editingId() !== null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    unit: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl<number | null>(null),
    ingredient_category_id: new FormControl<number | null>(null),
  });

  pictures = new FormArray<FormControl<string>>([]);

  ngOnInit(): void {
    this.categoryService.list().subscribe((items) => this.categories.set(items));
    this.allergenService.list().subscribe((items) => this.allergens.set(items));

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

      this.ingredientService.get(id).subscribe((ingredient) => {
        this.form.patchValue({
          name: ingredient.name,
          slug: ingredient.slug,
          unit: ingredient.unit,
          price: ingredient.price !== null ? Number(ingredient.price) : null,
          ingredient_category_id: ingredient.ingredient_category_id,
        });
        this.selectedAllergenIds.set(new Set((ingredient.allergens ?? []).map((allergen) => allergen.id)));

        for (const picture of ingredient.pictures ?? []) {
          this.pictures.push(new FormControl(picture.url, { nonNullable: true, validators: [Validators.required] }));
        }
      });
    }
  }

  toggleAllergen(id: number): void {
    this.selectedAllergenIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  onSlugInput(): void {
    this.slugTouched.set(true);
  }

  addPicture(): void {
    this.pictures.push(new FormControl('', { nonNullable: true, validators: [Validators.required] }));
  }

  removePicture(index: number): void {
    this.pictures.removeAt(index);
  }

  save(): void {
    if (this.form.invalid || this.pictures.invalid) {
      this.form.markAllAsTouched();
      this.pictures.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: IngredientPayload = {
      name: value.name,
      slug: value.slug,
      unit: value.unit,
      price: value.price,
      ingredient_category_id: value.ingredient_category_id,
      allergen_ids: [...this.selectedAllergenIds()],
      pictures: this.pictures.controls.map((control) => control.value).filter((url) => url.trim().length > 0),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.isEdit()
      ? this.ingredientService.update(this.editingId()!, payload)
      : this.ingredientService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
