import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { Category } from '../../core/models/category.model';
import { Station } from '../../core/models/station.model';
import { Ingredient, IngredientPayload } from '../../core/models/ingredient.model';
import { Difficulty, FicheTechniquePayload } from '../../core/models/fiche-technique.model';
import {
  ParsedFicheTechnique,
  ParsedFicheTechniqueBlock,
  ParsedIngredientLine,
  parseMultipleFicheTechniques,
} from '../../core/utils/fiche-technique-markdown';
import { slugify } from '../../core/utils/slugify';

const EXAMPLE = `# Crêpes sucrées
Station: Dessert
Catégorie: Brunch
Portions: 8
Difficulté: 2

## Description
Crêpes classiques pour le brunch du dimanche, à servir avec du sucre ou de la confiture.

## Matériel
- Fouet
- Poêle antiadhésive
- Saladier

## Ingrédients
### Pâte
- Farine de blé — 0.5 kg
- Oeufs — 4 pièce
- Lait entier — 0.75 L
### Divers
- Beurre — 0.05 kg

## Mise en place
Sortir le beurre à température ambiante, peser la farine et casser les oeufs avant de commencer.

## Étapes
1. Mélanger la farine et les oeufs dans un saladier.
2. Ajouter le lait progressivement en fouettant.
3. Laisser reposer la pâte au frais. (30 min)
4. Cuire chaque crêpe 1 à 2 minutes de chaque côté. (2 min)

## Dressage
Empiler 3 crêpes pliées en éventail, saupoudrer de sucre glace.

## Conseil du chef
Laisser reposer la pâte au moins 30 minutes pour des crêpes plus moelleuses.

## HACCP
Respecter la chaîne du froid pour le lait et les oeufs.

## Conservation
Se conserve 48h au réfrigérateur dans un contenant hermétique.

# Pain perdu
Station: Dessert
Catégorie: Brunch
Portions: 6
Difficulté: 1

## Ingrédients
- Pain rassis — 6 pièce
- Oeufs — 3 pièce
- Lait entier — 0.3 L

## Étapes
1. Tremper les tranches de pain dans le mélange oeufs-lait.
2. Cuire à la poêle jusqu'à coloration dorée. (4 min)
`;

interface IngredientMatch {
  line: ParsedIngredientLine;
  existing: Ingredient | null;
}

interface ResolvedBlock {
  block: ParsedFicheTechniqueBlock;
  matchedStation: Station | null;
  matchedCategory: Category | null;
  ingredientMatches: IngredientMatch[];
}

@Component({
  selector: 'app-fiche-technique-import',
  imports: [],
  templateUrl: './fiche-technique-import.html',
  styleUrl: './fiche-technique-import.css',
})
export class FicheTechniqueImport {
  private readonly http = inject(HttpClient);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly ingredientService = inject(IngredientService);
  private readonly categoryService = new SimpleEntityService<Category>(this.http, 'categories');
  private readonly stationService = new SimpleEntityService<Station>(this.http, 'stations');
  private readonly router = inject(Router);

  markdownText = signal(EXAMPLE);
  categories = signal<Category[]>([]);
  stations = signal<Station[]>([]);
  ingredients = signal<Ingredient[]>([]);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.categoryService.list().subscribe((items) => this.categories.set(items));
    this.stationService.list().subscribe((items) => this.stations.set(items));
    this.ingredientService.list().subscribe((items) => this.ingredients.set(items));
  }

  blocks = computed(() => parseMultipleFicheTechniques(this.markdownText()));

  resolved = computed<ResolvedBlock[]>(() => {
    const stations = this.stations();
    const categories = this.categories();
    const ingredients = this.ingredients();

    return this.blocks().map((block) => {
      if (!block.value) {
        return { block, matchedStation: null, matchedCategory: null, ingredientMatches: [] };
      }

      const fiche = block.value;

      return {
        block,
        matchedStation: fiche.station
          ? (stations.find((station) => slugify(station.name) === slugify(fiche.station!)) ?? null)
          : null,
        matchedCategory: fiche.category
          ? (categories.find((category) => slugify(category.name) === slugify(fiche.category!)) ?? null)
          : null,
        ingredientMatches: fiche.ingredients.map((line) => ({
          line,
          existing: ingredients.find((ingredient) => slugify(ingredient.name) === slugify(line.name)) ?? null,
        })),
      };
    });
  });

  validCount = computed(() => this.resolved().filter((r) => r.block.value !== null).length);
  errorCount = computed(() => this.resolved().filter((r) => r.block.value === null).length);

  /** Deduplicated across all fiches in the paste, so a shared new ingredient is only created once. */
  newIngredients = computed(() => {
    const byKey = new Map<string, ParsedIngredientLine>();
    for (const r of this.resolved()) {
      for (const match of r.ingredientMatches) {
        const key = slugify(match.line.name);
        if (!match.existing && !byKey.has(key)) {
          byKey.set(key, match.line);
        }
      }
    }
    return [...byKey.values()];
  });

  onTextInput(event: Event): void {
    this.markdownText.set((event.target as HTMLTextAreaElement).value);
  }

  save(): void {
    const validBlocks = this.resolved().filter((r) => r.block.value !== null);
    if (validBlocks.length === 0) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    const creations = this.newIngredients().map((line) => {
      const payload: IngredientPayload = {
        name: line.name,
        slug: slugify(line.name),
        unit: line.unit || 'unité',
        price: null,
        ingredient_category_id: null,
        allergen_ids: [],
        pictures: [],
      };
      return this.ingredientService.create(payload);
    });

    const createMissing$ = creations.length > 0 ? forkJoin(creations) : of([] as Ingredient[]);

    createMissing$
      .pipe(
        switchMap((createdIngredients) => {
          const idByName = new Map<string, number>();
          for (const ingredient of this.ingredients()) idByName.set(slugify(ingredient.name), ingredient.id);
          for (const ingredient of createdIngredients) idByName.set(slugify(ingredient.name), ingredient.id);

          const payloads = validBlocks.map((r) => this.buildPayload(r.block.value!, r, idByName));
          return forkJoin(payloads.map((payload) => this.ficheTechniqueService.create(payload)));
        }),
      )
      .subscribe({
        next: () => this.router.navigate(['/fiche-techniques']),
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(
            "Une erreur est survenue lors de la création (vérifiez que les slugs générés ne sont pas déjà utilisés).",
          );
        },
      });
  }

  private buildPayload(
    fiche: ParsedFicheTechnique,
    resolvedBlock: ResolvedBlock,
    idByName: Map<string, number>,
  ): FicheTechniquePayload {
    return {
      name: fiche.name,
      slug: slugify(fiche.name),
      category_id: resolvedBlock.matchedCategory?.id ?? null,
      station_id: resolvedBlock.matchedStation?.id ?? null,
      servings: fiche.servings ?? 10,
      difficulty: (fiche.difficulty ?? 1) as Difficulty,
      description: fiche.description,
      equipment: fiche.equipment,
      mise_en_place: fiche.miseEnPlace,
      plating: fiche.plating,
      chef_tip: fiche.chefTip,
      haccp: fiche.haccp,
      conservation: fiche.conservation,
      ingredients: fiche.ingredients.map((line) => ({
        ingredient_id: idByName.get(slugify(line.name))!,
        quantity: line.quantity ?? 0,
        group_label: line.group,
      })),
      steps: fiche.steps.map((step) => ({ instruction: step.instruction, timer_minutes: step.timerMinutes })),
    };
  }
}
