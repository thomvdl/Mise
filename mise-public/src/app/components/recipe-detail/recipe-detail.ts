import { Component, DestroyRef, ElementRef, effect, inject, input, signal, computed, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { FicheTechnique, FicheTechniqueComponent, FicheTechniqueIngredient } from '../../core/models/fiche-technique.model';
import { uniqueAllergens } from '../../core/utils/enrich-fiche-technique';
import { formatQuantity as formatQuantityUtil } from '../../core/utils/format-quantity';

interface TimerState {
  remainingSec: number;
  totalSec: number;
  running: boolean;
}

interface ScaledIngredientLine {
  ingredient: FicheTechniqueIngredient;
  quantity: number;
  lineCost: number | null;
}

/** Une fiche technique utilisée comme composant, affichée telle quelle (lien + multiplicateur) —
 * pas de recalcul récursif vers ses propres ingrédients, ça n'entre pas dans le coût matière. */
interface ScaledComponentLine {
  component: FicheTechniqueComponent;
  quantity: number;
}

interface IngredientGroup {
  label: string | null;
  lines: ScaledIngredientLine[];
  componentLines: ScaledComponentLine[];
}

const DIAL_RADIUS = 46;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;
const TIMER_RADIUS = 12;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

@Component({
  selector: 'app-recipe-detail',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.css',
})
export class RecipeDetail {
  private readonly destroyRef = inject(DestroyRef);

  private readonly dialEl = viewChild<ElementRef<HTMLDivElement>>('dialEl');
  private dragging = false;

  fiche = input<FicheTechnique | null>(null);

  servings = signal(0);
  doneSteps = signal<Set<number>>(new Set());
  timers = signal<Map<number, TimerState>>(new Map());

  readonly dialCircumference = DIAL_CIRCUMFERENCE;
  readonly timerCircumference = TIMER_CIRCUMFERENCE;

  allergens = computed(() => {
    const fiche = this.fiche();
    return fiche ? uniqueAllergens(fiche) : [];
  });

  usedIn = computed(() => this.fiche()?.used_in ?? []);

  scaleFactor = computed(() => {
    const fiche = this.fiche();
    return fiche && fiche.servings > 0 ? this.servings() / fiche.servings : 1;
  });

  scaledIngredients = computed<ScaledIngredientLine[]>(() => {
    const factor = this.scaleFactor();

    return (this.fiche()?.ingredients ?? []).map((ingredient) => {
      const quantity = Number(ingredient.pivot.quantity) * factor;
      const price = ingredient.price !== null ? Number(ingredient.price) : null;

      return {
        ingredient,
        quantity,
        lineCost: price !== null ? price * quantity : null,
      };
    });
  });

  /** Multiplicateur mis à l'échelle des portions, tel quel — pas de recalcul récursif. */
  scaledComponents = computed<ScaledComponentLine[]>(() => {
    const factor = this.scaleFactor();

    return (this.fiche()?.components ?? []).map((component) => ({
      component,
      quantity: Number(component.pivot.quantity) * factor,
    }));
  });

  /** Ingrédients ET composants regroupés par sous-recette (pivot.group_label), dans l'ordre de
   * première apparition — un composant s'affiche comme une ligne de plus dans le même tableau. */
  groupedIngredients = computed<IngredientGroup[]>(() => {
    const groups: IngredientGroup[] = [];
    const byKey = new Map<string, IngredientGroup>();

    const ensureGroup = (label: string | null): IngredientGroup => {
      const key = label ?? '';
      let group = byKey.get(key);
      if (!group) {
        group = { label, lines: [], componentLines: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      return group;
    };

    for (const line of this.scaledIngredients()) {
      ensureGroup(line.ingredient.pivot.group_label).lines.push(line);
    }
    for (const line of this.scaledComponents()) {
      ensureGroup(line.component.pivot.group_label).componentLines.push(line);
    }

    return groups;
  });

  showIngredientGroupLabels = computed(() => this.groupedIngredients().length > 1);

  totalCost = computed(() =>
    this.scaledIngredients().reduce((sum, line) => sum + (line.lineCost ?? 0), 0),
  );

  /** True when at least one ingredient has no price — totalCost()/costPerPortion() then understate the real cost. */
  hasIncompleteCost = computed(() => this.scaledIngredients().some((line) => line.lineCost === null));

  costPerPortion = computed(() => {
    const servings = this.servings();
    return servings > 0 ? this.totalCost() / servings : null;
  });

  /** Échelle fixe sur la plage cliquable (1 à 100 portions) plutôt que relative à la fiche —
   * sinon l'anneau sature dès ~2x les portions de base et reste plein sur tout le reste de la plage. */
  dialOffset = computed(() => {
    const ratio = Math.min(this.servings() / 100, 1);
    return this.dialCircumference * (1 - ratio);
  });

  constructor() {
    effect(() => {
      const fiche = this.fiche();
      this.servings.set(fiche?.servings ?? 0);
      this.doneSteps.set(new Set());

      const nextTimers = new Map<number, TimerState>();
      for (const step of fiche?.steps ?? []) {
        if (step.timer_minutes) {
          const totalSec = step.timer_minutes * 60;
          nextTimers.set(step.id, { remainingSec: totalSec, totalSec, running: false });
        }
      }
      this.timers.set(nextTimers);
    });

    const intervalId = setInterval(() => this.tickTimers(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  adjustServings(delta: number) {
    this.servings.update((value) => Math.min(100, Math.max(1, value + delta)));
  }

  onDialPointerDown(event: PointerEvent) {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging = true;
    this.setServingsFromPointer(event);
  }

  onDialPointerMove(event: PointerEvent) {
    if (this.dragging) this.setServingsFromPointer(event);
  }

  onDialPointerUp(event: PointerEvent) {
    this.dragging = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }

  /** Angle depuis le centre du dial, en partant du haut (12h) et dans le sens horaire — le
   * ring visuel est tourné de -90deg en CSS, donc 12h = 0% et on fait un tour complet pour 100%. */
  private setServingsFromPointer(event: PointerEvent) {
    const rect = this.dialEl()?.nativeElement.getBoundingClientRect();
    if (!rect) return;

    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    let angleFromTop = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angleFromTop < 0) angleFromTop += 360;

    const value = Math.round((angleFromTop / 360) * 100);
    this.servings.set(Math.min(100, Math.max(1, value)));
  }

  toggleStep(stepId: number) {
    this.doneSteps.update((done) => {
      const next = new Set(done);
      next.has(stepId) ? next.delete(stepId) : next.add(stepId);
      return next;
    });
  }

  toggleTimer(stepId: number) {
    this.timers.update((timers) => {
      const state = timers.get(stepId);
      if (!state) return timers;

      const next = new Map(timers);
      next.set(stepId, {
        ...state,
        running: !state.running,
        remainingSec: state.remainingSec <= 0 ? state.totalSec : state.remainingSec,
      });
      return next;
    });
  }

  timerOffset(state: TimerState) {
    const ratio = state.totalSec > 0 ? state.remainingSec / state.totalSec : 0;
    return this.timerCircumference * (1 - ratio);
  }

  formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  print(): void {
    window.print();
  }

  generatedAt(): string {
    return new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private tickTimers() {
    this.timers.update((timers) => {
      let changed = false;
      const next = new Map(timers);

      for (const [stepId, state] of next) {
        if (state.running && state.remainingSec > 0) {
          const remainingSec = state.remainingSec - 1;
          next.set(stepId, {
            ...state,
            remainingSec,
            running: remainingSec > 0,
          });
          changed = true;
        }
      }

      return changed ? next : timers;
    });
  }

  formatQuantity(quantity: number, unit: string): string {
    return formatQuantityUtil(quantity, unit);
  }
}
