import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { Category } from '../../core/models/category.model';
import { Station } from '../../core/models/station.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { Difficulty, FicheTechniquePayload } from '../../core/models/fiche-technique.model';
import { Picture } from '../../core/models/picture.model';
import { slugify } from '../../core/utils/slugify';

type IngredientRow = FormGroup<{
  ingredient_id: FormControl<number | null>;
  quantity: FormControl<number | null>;
}>;

type IngredientGroup = FormGroup<{
  label: FormControl<string>;
  rows: FormArray<IngredientRow>;
}>;

type StepRow = FormGroup<{
  instruction: FormControl<string>;
  timer_minutes: FormControl<number | null>;
}>;

@Component({
  selector: 'app-fiche-technique-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './fiche-technique-form.html',
  styleUrl: './fiche-technique-form.css',
})
export class FicheTechniqueForm implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly ingredientService = inject(IngredientService);
  private readonly categoryService = new SimpleEntityService<Category>(this.http, 'categories');
  private readonly stationService = new SimpleEntityService<Station>(this.http, 'stations');
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly difficultyOptions: { value: Difficulty; label: string }[] = [
    { value: 1, label: 'Facile' },
    { value: 2, label: 'Moyen' },
    { value: 3, label: 'Difficile' },
  ];

  editingId = signal<number | null>(null);
  slugTouched = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  categories = signal<Category[]>([]);
  stations = signal<Station[]>([]);
  ingredients = signal<Ingredient[]>([]);
  linkedPictures = signal<Picture[]>([]);

  isEdit = computed(() => this.editingId() !== null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    category_id: new FormControl<number | null>(null),
    station_id: new FormControl<number | null>(null),
    servings: new FormControl(10, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    difficulty: new FormControl<Difficulty>(1, { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl(''),
    mise_en_place: new FormControl(''),
    plating: new FormControl(''),
    chef_tip: new FormControl(''),
    haccp: new FormControl(''),
    conservation: new FormControl(''),
  });

  equipment = new FormArray<FormControl<string>>([]);
  ingredientGroups = new FormArray<IngredientGroup>([]);
  stepRows = new FormArray<StepRow>([]);

  ngOnInit(): void {
    this.categoryService.list().subscribe((items) => this.categories.set(items));
    this.stationService.list().subscribe((items) => this.stations.set(items));
    this.ingredientService.list().subscribe((items) => this.ingredients.set(items));

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

      this.ficheTechniqueService.get(id).subscribe((fiche) => {
        this.form.patchValue({
          name: fiche.name,
          slug: fiche.slug,
          category_id: fiche.category_id,
          station_id: fiche.station_id,
          servings: fiche.servings,
          difficulty: fiche.difficulty,
          description: fiche.description ?? '',
          mise_en_place: fiche.mise_en_place ?? '',
          plating: fiche.plating ?? '',
          chef_tip: fiche.chef_tip ?? '',
          haccp: fiche.haccp ?? '',
          conservation: fiche.conservation ?? '',
        });

        for (const item of fiche.equipment ?? []) {
          this.equipment.push(new FormControl(item, { nonNullable: true, validators: [Validators.required] }));
        }
        this.linkedPictures.set(fiche.pictures ?? []);

        const groupsByLabel = new Map<string, IngredientGroup>();
        for (const ingredient of fiche.ingredients ?? []) {
          const label = ingredient.pivot.group_label ?? '';
          let group = groupsByLabel.get(label);
          if (!group) {
            group = this.buildIngredientGroup(label);
            groupsByLabel.set(label, group);
            this.ingredientGroups.push(group);
          }
          group.controls.rows.push(this.buildIngredientRow(ingredient.id, Number(ingredient.pivot.quantity)));
        }

        for (const step of fiche.steps ?? []) {
          this.stepRows.push(this.buildStepRow(step.instruction, step.timer_minutes));
        }

        if (this.ingredientGroups.length === 0) {
          this.ingredientGroups.push(this.buildIngredientGroup(''));
        }
      });
    } else {
      this.ingredientGroups.push(this.buildIngredientGroup(''));
    }
  }

  onSlugInput(): void {
    this.slugTouched.set(true);
  }

  addEquipment(): void {
    this.equipment.push(new FormControl('', { nonNullable: true, validators: [Validators.required] }));
  }

  removeEquipment(index: number): void {
    this.equipment.removeAt(index);
  }

  private buildIngredientRow(ingredientId: number | null, quantity: number | null): IngredientRow {
    return new FormGroup({
      ingredient_id: new FormControl<number | null>(ingredientId, { validators: [Validators.required] }),
      quantity: new FormControl<number | null>(quantity, { validators: [Validators.required, Validators.min(0)] }),
    });
  }

  private buildIngredientGroup(label: string): IngredientGroup {
    return new FormGroup({
      label: new FormControl(label, { nonNullable: true }),
      rows: new FormArray<IngredientRow>([]),
    });
  }

  addIngredientGroup(): void {
    this.ingredientGroups.push(this.buildIngredientGroup(''));
  }

  removeIngredientGroup(index: number): void {
    this.ingredientGroups.removeAt(index);
  }

  addIngredientRow(groupIndex: number): void {
    this.ingredientGroups.at(groupIndex).controls.rows.push(this.buildIngredientRow(null, null));
  }

  removeIngredientRow(groupIndex: number, rowIndex: number): void {
    this.ingredientGroups.at(groupIndex).controls.rows.removeAt(rowIndex);
  }

  private buildStepRow(instruction: string, timerMinutes: number | null): StepRow {
    return new FormGroup({
      instruction: new FormControl(instruction, { nonNullable: true, validators: [Validators.required] }),
      timer_minutes: new FormControl<number | null>(timerMinutes),
    });
  }

  addStepRow(): void {
    this.stepRows.push(this.buildStepRow('', null));
  }

  removeStepRow(index: number): void {
    this.stepRows.removeAt(index);
  }

  moveStep(index: number, direction: -1 | 1): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.stepRows.length) return;

    const control = this.stepRows.at(index);
    this.stepRows.removeAt(index);
    this.stepRows.insert(newIndex, control);
  }

  save(): void {
    this.ingredientGroups.markAllAsTouched();
    this.stepRows.markAllAsTouched();

    if (
      this.form.invalid ||
      this.equipment.invalid ||
      this.ingredientGroups.invalid ||
      this.stepRows.invalid
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const payload: FicheTechniquePayload = {
      name: value.name,
      slug: value.slug,
      category_id: value.category_id,
      station_id: value.station_id,
      servings: value.servings,
      difficulty: value.difficulty,
      description: value.description || null,
      equipment: this.equipment.controls.map((control) => control.value).filter((v) => v.trim().length > 0),
      mise_en_place: value.mise_en_place || null,
      plating: value.plating || null,
      chef_tip: value.chef_tip || null,
      haccp: value.haccp || null,
      conservation: value.conservation || null,
      ingredients: this.ingredientGroups.controls.flatMap((group) => {
        const label = group.controls.label.value.trim() || null;
        return group.controls.rows.controls.map((row) => ({
          ingredient_id: row.controls.ingredient_id.value as number,
          quantity: row.controls.quantity.value as number,
          group_label: label,
        }));
      }),
      steps: this.stepRows.controls.map((row) => ({
        instruction: row.controls.instruction.value,
        timer_minutes: row.controls.timer_minutes.value,
      })),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.isEdit()
      ? this.ficheTechniqueService.update(this.editingId()!, payload)
      : this.ficheTechniqueService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
