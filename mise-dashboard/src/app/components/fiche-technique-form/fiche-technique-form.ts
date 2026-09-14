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
import { Difficulty, FicheTechnique, FicheTechniquePayload } from '../../core/models/fiche-technique.model';
import { Picture } from '../../core/models/picture.model';
import { slugify } from '../../core/utils/slugify';
import { smallUnitFor } from '../../core/utils/format-quantity';
import { IngredientSearchSelect } from '../ingredient-search-select/ingredient-search-select';
import { FicheTechniqueSearchSelect } from '../fiche-technique-search-select/fiche-technique-search-select';

type RowKind = 'ingredient' | 'fiche';

/**
 * Une ligne de la liste "Ingrédients" pointe soit vers un ingrédient, soit vers une autre fiche
 * technique utilisée comme composant (ex. "Fond brun" dans un "Bœuf bourguignon") — `kind`
 * détermine lequel des deux champs id est actif ; l'autre reste null et sans validateur.
 */
type IngredientRow = FormGroup<{
  kind: FormControl<RowKind>;
  ingredient_id: FormControl<number | null>;
  component_fiche_technique_id: FormControl<number | null>;
  quantity: FormControl<number | null>;
  /** Unité dans laquelle `quantity` est actuellement saisie (kg OU g pour un ingrédient en kg,
   * jamais autre chose) — convertie vers l'unité de base de l'ingrédient à l'enregistrement.
   * Sans objet (chaîne vide) pour une ligne de type "fiche". */
  input_unit: FormControl<string>;
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
  imports: [ReactiveFormsModule, RouterLink, IngredientSearchSelect, FicheTechniqueSearchSelect],
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
  fiches = signal<FicheTechnique[]>([]);
  linkedPictures = signal<Picture[]>([]);
  usedIn = signal<FicheTechnique[]>([]);

  isEdit = computed(() => this.editingId() !== null);

  /** Une fiche ne peut pas se référencer elle-même comme composant (revérifié côté serveur). */
  availableComponentFiches = computed(() => this.fiches().filter((f) => f.id !== this.editingId()));

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
    this.ficheTechniqueService.list().subscribe((items) => this.fiches.set(items));

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
        this.usedIn.set(fiche.used_in ?? []);

        const groupsByLabel = new Map<string, IngredientGroup>();
        const ensureGroup = (label: string): IngredientGroup => {
          let group = groupsByLabel.get(label);
          if (!group) {
            group = this.buildIngredientGroup(label);
            groupsByLabel.set(label, group);
            this.ingredientGroups.push(group);
          }
          return group;
        };

        for (const ingredient of fiche.ingredients ?? []) {
          const group = ensureGroup(ingredient.pivot.group_label ?? '');
          group.controls.rows.push(
            this.buildIngredientRow(ingredient.id, Number(ingredient.pivot.quantity), ingredient.unit),
          );
        }

        for (const component of fiche.components ?? []) {
          const group = ensureGroup(component.pivot.group_label ?? '');
          group.controls.rows.push(this.buildFicheRow(component.id, Number(component.pivot.quantity)));
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

  /**
   * `unit` est l'unité de base réelle de l'ingrédient (connue à l'édition via
   * `FicheTechniqueIngredient.unit`, ou résolue au choix de l'ingrédient pour une ligne neuve).
   * Pour une unité convertible (kg/L), une quantité déjà petite (< 1) est présentée d'emblée dans
   * la sous-unité (g/mL) — cohérent avec l'affichage de `formatQuantity` ailleurs dans l'app.
   */
  private buildIngredientRow(ingredientId: number | null, quantity: number | null, unit: string | null): IngredientRow {
    const conversion = unit ? smallUnitFor(unit) : null;
    const useSmallUnit = conversion !== null && quantity !== null && Math.abs(quantity) < 1;

    const row = new FormGroup({
      kind: new FormControl<RowKind>('ingredient', { nonNullable: true }),
      ingredient_id: new FormControl<number | null>(ingredientId, { validators: [Validators.required] }),
      component_fiche_technique_id: new FormControl<number | null>(null),
      quantity: new FormControl<number | null>(
        useSmallUnit ? this.round(quantity! * conversion!.factor, 0) : quantity,
        { validators: [Validators.required, Validators.min(0)] },
      ),
      input_unit: new FormControl(useSmallUnit ? conversion!.unit : (unit ?? ''), { nonNullable: true }),
    });

    // Une ligne neuve n'a pas d'unité tant qu'aucun ingrédient n'est choisi — dès que l'ingrédient
    // change (neuf ou remplacé), on retombe sur son unité de base (jamais la petite unité : rien
    // ne justifie de deviner une magnitude pour une quantité que le chef n'a pas encore saisie).
    row.controls.ingredient_id.valueChanges.subscribe((id) => {
      const newUnit = id !== null ? (this.ingredients().find((i) => i.id === id)?.unit ?? '') : '';
      row.controls.input_unit.setValue(newUnit);
    });

    return row;
  }

  /** `quantity` est une fraction/un multiple de la recette de base du composant (1 = une
   * préparation complète), pas une masse/un volume — pas d'unité, donc pas de sélecteur g/mL. */
  private buildFicheRow(componentId: number | null, quantity: number | null): IngredientRow {
    return new FormGroup({
      kind: new FormControl<RowKind>('fiche', { nonNullable: true }),
      ingredient_id: new FormControl<number | null>(null),
      component_fiche_technique_id: new FormControl<number | null>(componentId, { validators: [Validators.required] }),
      quantity: new FormControl<number | null>(quantity, { validators: [Validators.required, Validators.min(0.001)] }),
      input_unit: new FormControl('', { nonNullable: true }),
    });
  }

  /** Bascule une ligne entre "ingrédient" et "fiche technique" — remet à zéro les deux champs id
   * (une ligne ne peut représenter qu'un seul des deux) et réattache les validateurs du bon champ. */
  setRowKind(row: IngredientRow, kind: RowKind): void {
    if (row.controls.kind.value === kind) return;

    row.controls.kind.setValue(kind);
    row.controls.ingredient_id.setValue(null);
    row.controls.component_fiche_technique_id.setValue(null);
    row.controls.quantity.setValue(null);
    row.controls.input_unit.setValue('');

    if (kind === 'ingredient') {
      row.controls.ingredient_id.setValidators([Validators.required]);
      row.controls.component_fiche_technique_id.clearValidators();
      row.controls.quantity.setValidators([Validators.required, Validators.min(0)]);
    } else {
      row.controls.ingredient_id.clearValidators();
      row.controls.component_fiche_technique_id.setValidators([Validators.required]);
      row.controls.quantity.setValidators([Validators.required, Validators.min(0.001)]);
    }

    row.controls.ingredient_id.updateValueAndValidity();
    row.controls.component_fiche_technique_id.updateValueAndValidity();
    row.controls.quantity.updateValueAndValidity();
  }

  /** Unité de base + sous-unité de l'ingrédient sélectionné sur cette ligne, ou null si non
   * convertible (pièce, c. à café…) ou si aucun ingrédient n'est encore choisi. */
  unitOptions(row: IngredientRow): { base: string; small: string; factor: number } | null {
    const ingredientId = row.controls.ingredient_id.value;
    const baseUnit = ingredientId !== null ? this.ingredients().find((i) => i.id === ingredientId)?.unit : null;
    if (!baseUnit) return null;

    const conversion = smallUnitFor(baseUnit);
    return conversion ? { base: baseUnit, small: conversion.unit, factor: conversion.factor } : null;
  }

  /** Bascule la ligne vers `unit` (base ou sous-unité) en reconvertissant la quantité affichée
   * pour représenter la même quantité réelle — 0.003 kg devient 3 g, jamais 0.003 g. */
  setInputUnit(row: IngredientRow, unit: string): void {
    const opts = this.unitOptions(row);
    if (!opts || row.controls.input_unit.value === unit) return;

    const currentQty = row.controls.quantity.value;
    if (currentQty !== null) {
      const goingToSmall = unit === opts.small;
      const converted = goingToSmall ? currentQty * opts.factor : currentQty / opts.factor;
      row.controls.quantity.setValue(this.round(converted, goingToSmall ? 0 : 3));
    }

    row.controls.input_unit.setValue(unit);
  }

  /** Pas de saisie adapté à l'unité affichée : grammes/millilitres entiers, ou millièmes en kg/L. */
  quantityStep(row: IngredientRow): string {
    const opts = this.unitOptions(row);
    return opts && row.controls.input_unit.value === opts.small ? '1' : '0.001';
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
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
    this.ingredientGroups.at(groupIndex).controls.rows.push(this.buildIngredientRow(null, null, null));
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
        return group.controls.rows.controls
          .filter((row) => row.controls.kind.value === 'ingredient')
          .map((row) => {
            const opts = this.unitOptions(row);
            const rawQuantity = row.controls.quantity.value as number;
            // La quantité est saisie dans `input_unit` (base ou sous-unité) — on la reconvertit
            // vers l'unité de base de l'ingrédient, seule unité que l'API accepte.
            const quantity =
              opts && row.controls.input_unit.value === opts.small ? rawQuantity / opts.factor : rawQuantity;

            return {
              ingredient_id: row.controls.ingredient_id.value as number,
              quantity,
              group_label: label,
            };
          });
      }),
      components: this.ingredientGroups.controls.flatMap((group) => {
        const label = group.controls.label.value.trim() || null;
        return group.controls.rows.controls
          .filter((row) => row.controls.kind.value === 'fiche')
          .map((row) => ({
            component_fiche_technique_id: row.controls.component_fiche_technique_id.value as number,
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
