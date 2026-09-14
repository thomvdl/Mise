import { Component, ElementRef, HostListener, computed, effect, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { FicheTechnique } from '../../core/models/fiche-technique.model';

const MAX_RESULTS = 8;

/**
 * Combobox de recherche pour choisir une fiche technique comme composant — même comportement que
 * `IngredientSearchSelect` (dont c'est une quasi-copie typée différemment plutôt qu'une
 * généricisation, ce composant n'étant utilisé qu'ici) : tape pour filtrer par nom, sélectionne
 * un résultat pour valider la valeur ; retaper après une sélection invalide la valeur jusqu'à un
 * nouveau choix.
 */
@Component({
  selector: 'app-fiche-technique-search-select',
  imports: [],
  templateUrl: './fiche-technique-search-select.html',
  styleUrl: './fiche-technique-search-select.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FicheTechniqueSearchSelect),
      multi: true,
    },
  ],
})
export class FicheTechniqueSearchSelect implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  fiches = input<FicheTechnique[]>([]);

  query = signal('');
  open = signal(false);
  activeIndex = signal(0);
  selectedId = signal<number | null>(null);
  disabled = signal(false);

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  selectedFiche = computed(() => this.fiches().find((f) => f.id === this.selectedId()) ?? null);

  private matches = computed(() => {
    const q = this.normalize(this.query());
    const all = this.fiches();
    if (!q) return all;
    return all.filter((fiche) => this.normalize(fiche.name).includes(q));
  });

  results = computed(() => this.matches().slice(0, MAX_RESULTS));
  moreCount = computed(() => Math.max(0, this.matches().length - MAX_RESULTS));

  constructor() {
    // `writeValue` peut arriver avant que `fiches` (chargée à part par le parent) ne soit
    // peuplée — resynchronise le texte affiché dès que la liste arrive, plutôt que de figer un
    // champ vide. Ignoré pendant que l'utilisateur tape/navigue (`open()`) pour ne pas écraser sa saisie.
    effect(() => {
      const id = this.selectedId();
      const list = this.fiches();
      if (this.open()) return;

      const fiche = list.find((f) => f.id === id);
      this.query.set(fiche ? fiche.name : '');
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

  select(fiche: FicheTechnique): void {
    this.selectedId.set(fiche.id);
    this.query.set(fiche.name);
    this.open.set(false);
    this.onChange(fiche.id);
    this.onTouched();
  }

  private close(): void {
    this.open.set(false);
    // Une recherche laissée sans sélection valide revient à la dernière fiche choisie (ou vide)
    // — géré par l'effect ci-dessus dès que `open()` repasse à false.
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
