import { Component, ElementRef, HostListener, computed, effect, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { Ingredient } from '../../core/models/ingredient.model';

const MAX_RESULTS = 8;

/**
 * Combobox de recherche remplaçant le <select> natif du choix d'ingrédient dans le formulaire
 * de fiche technique — un <select> à plat sur ~350 ingrédients n'est pas navigable. Tape pour
 * filtrer par nom, sélectionne un résultat pour valider la valeur ; retaper après une sélection
 * invalide la valeur (comme un <select> resté sur "— Choisir —") jusqu'à un nouveau choix.
 */
@Component({
  selector: 'app-ingredient-search-select',
  imports: [],
  templateUrl: './ingredient-search-select.html',
  styleUrl: './ingredient-search-select.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IngredientSearchSelect),
      multi: true,
    },
  ],
})
export class IngredientSearchSelect implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  ingredients = input<Ingredient[]>([]);

  query = signal('');
  open = signal(false);
  activeIndex = signal(0);
  selectedId = signal<number | null>(null);
  disabled = signal(false);

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  selectedIngredient = computed(() => this.ingredients().find((i) => i.id === this.selectedId()) ?? null);

  private matches = computed(() => {
    const q = this.normalize(this.query());
    const all = this.ingredients();
    if (!q) return all;
    return all.filter((ingredient) => this.normalize(ingredient.name).includes(q));
  });

  results = computed(() => this.matches().slice(0, MAX_RESULTS));
  moreCount = computed(() => Math.max(0, this.matches().length - MAX_RESULTS));

  constructor() {
    // `writeValue` peut arriver avant que `ingredients` (chargée à part par le parent) ne soit
    // peuplée — resynchronise le texte affiché dès que la liste arrive, plutôt que de figer un
    // champ vide. Ignoré pendant que l'utilisateur tape/navigue (`open()`) pour ne pas écraser sa saisie.
    effect(() => {
      const id = this.selectedId();
      const list = this.ingredients();
      if (this.open()) return;

      const ingredient = list.find((i) => i.id === id);
      this.query.set(ingredient ? ingredient.name : '');
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  writeValue(value: number | null): void {
    this.selectedId.set(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    this.activeIndex.set(0);

    if (this.selectedId() !== null) {
      this.selectedId.set(null);
      this.onChange(null);
    }
  }

  onFocus(): void {
    this.open.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        this.activeIndex.update((i) => (count === 0 ? 0 : (i + 1) % count));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open.set(true);
        this.activeIndex.update((i) => (count === 0 ? 0 : (i - 1 + count) % count));
        break;
      case 'Enter': {
        const active = this.results()[this.activeIndex()];
        if (this.open() && active) {
          event.preventDefault();
          this.select(active);
        }
        break;
      }
      case 'Escape':
        this.close();
        break;
    }
  }

  select(ingredient: Ingredient): void {
    this.selectedId.set(ingredient.id);
    this.query.set(ingredient.name);
    this.open.set(false);
    this.onChange(ingredient.id);
    this.onTouched();
  }

  private close(): void {
    this.open.set(false);
    // Une recherche laissée sans sélection valide revient au dernier ingrédient choisi (ou
    // vide) — géré par l'effect ci-dessus dès que `open()` repasse à false.
    this.onTouched();
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }
}
