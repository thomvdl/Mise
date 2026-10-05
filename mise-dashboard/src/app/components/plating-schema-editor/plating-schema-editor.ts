import { Component, ElementRef, computed, forwardRef, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { PlateShape, PlatingSchema, PlatingSchemaElement, PlatingSchemaShape } from '../../core/models/fiche-technique.model';

const EMPTY_SCHEMA: PlatingSchema = { elements: [] };

const PLATE_SHAPES: { value: PlateShape; label: string }[] = [
  { value: 'round', label: 'Ronde' },
  { value: 'round-small', label: 'Ronde petite' },
  { value: 'oval', label: 'Ovale' },
  { value: 'square', label: 'Carrée' },
  { value: 'rect', label: 'Rectangle' },
];

interface ElementPreset {
  label: string;
  shape: PlatingSchemaShape;
  width: number;
  height: number;
  color: string;
}

/** Plusieurs préréglages partagent la même forme géométrique (ex. Sauce et Goutte sont toutes
 * deux des ellipses rondes) — seules les dimensions et la couleur par défaut les distinguent à la
 * pose ; le chef peut ensuite ajuster librement chaque élément posé (y compris sa forme, en
 * changeant largeur et hauteur indépendamment). */
const PRESETS: ElementPreset[] = [
  { label: 'Portion', shape: 'ellipse', width: 18, height: 18, color: '#1F6E99' },
  { label: 'Quenelle', shape: 'ellipse', width: 24, height: 14, color: '#9C5A28' },
  { label: 'Sauce', shape: 'ellipse', width: 28, height: 28, color: '#A5382C' },
  { label: 'Trait', shape: 'rect', width: 30, height: 10, color: '#A5382C' },
  { label: 'Garniture', shape: 'rect', width: 20, height: 7, color: '#48693F' },
  { label: 'Goutte', shape: 'ellipse', width: 8, height: 8, color: '#A5382C' },
];

const SHAPE_LABELS: Record<PlatingSchemaShape, string> = {
  ellipse: 'Ellipse',
  rect: 'Rectangle',
};

export const COLOR_PRESETS = ['#1F6E99', '#9C5A28', '#A5382C', '#48693F'];

/** Grille d'accrochage pour le déplacement (en % du cadre) et pas de rotation (en degrés) — 360 /
 * 22.5 = 16 positions régulières, donc pas de dernier pas raccourci en bouclant. */
const GRID_STEP = 5;
const ROTATION_STEP = 22.5;

/**
 * Éditeur visuel du schéma de dressage : un cercle (l'assiette) sur lequel on place et déplace des
 * formes représentant portions/sauces/garnitures. Implémenté en `ControlValueAccessor` — même
 * pattern que `DatetimePicker` — pour s'intégrer directement via `formControlName` dans le
 * formulaire de fiche technique.
 */
@Component({
  selector: 'app-plating-schema-editor',
  imports: [],
  templateUrl: './plating-schema-editor.html',
  styleUrl: './plating-schema-editor.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PlatingSchemaEditor),
      multi: true,
    },
  ],
})
export class PlatingSchemaEditor implements ControlValueAccessor {
  /** Exposé pour les calculs de rayon de la zone de préhension (`ps-hit`) dans le template. */
  readonly Math = Math;

  readonly colorPresets = COLOR_PRESETS;
  readonly presets = PRESETS;
  readonly plateShapes = PLATE_SHAPES;

  plate = viewChild.required<ElementRef<SVGSVGElement>>('plate');

  disabled = signal(false);
  schema = signal<PlatingSchema>(EMPTY_SCHEMA);
  selectedId = signal<string | null>(null);

  elements = computed(() => this.schema().elements);
  plateShape = computed<PlateShape>(() => this.schema().plate ?? 'round');
  selectedElement = computed<PlatingSchemaElement | null>(
    () => this.elements().find((e) => e.id === this.selectedId()) ?? null,
  );
  /** L'ordre du tableau = l'ordre d'empilement SVG (le dernier peint est au-dessus) — ces deux
   * drapeaux désactivent le bouton de calque déjà sans effet (déjà au premier/arrière-plan). */
  isSelectedOnTop = computed(() => {
    const els = this.elements();
    return els.length > 0 && els[els.length - 1].id === this.selectedId();
  });
  isSelectedOnBottom = computed(() => {
    const els = this.elements();
    return els.length > 0 && els[0].id === this.selectedId();
  });

  /** Points de la grille virtuelle, régénérés une seule fois (ne dépend d'aucun signal). */
  readonly gridPoints: { x: number; y: number }[] = (() => {
    const points: { x: number; y: number }[] = [];
    for (let x = 0; x <= 100; x += GRID_STEP) {
      for (let y = 0; y <= 100; y += GRID_STEP) {
        points.push({ x, y });
      }
    }
    return points;
  })();

  private dragging: {
    id: string;
    pointerId: number;
    mode: 'move' | 'scale' | 'resize-width' | 'resize-height' | 'rotate';
  } | null = null;

  private onChange: (value: PlatingSchema | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: PlatingSchema | null): void {
    this.schema.set(value ?? EMPTY_SCHEMA);
    this.selectedId.set(null);
  }

  registerOnChange(fn: (value: PlatingSchema | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  setPlateShape(shape: PlateShape): void {
    if (this.disabled()) return;
    this.mutate(() => ({ plate: shape }));
  }

  addElement(preset: ElementPreset): void {
    if (this.disabled()) return;

    const element: PlatingSchemaElement = {
      id: crypto.randomUUID(),
      shape: preset.shape,
      x: 50,
      y: 50,
      width: preset.width,
      height: preset.height,
      rotation: 0,
      color: preset.color,
      label: null,
    };

    this.mutate((s) => ({ elements: [...s.elements, element] }));
    this.selectedId.set(element.id);
  }

  removeElement(id: string): void {
    this.mutate((s) => ({ elements: s.elements.filter((e) => e.id !== id) }));
    if (this.selectedId() === id) this.selectedId.set(null);
  }

  removeSelected(): void {
    const id = this.selectedId();
    if (id) this.removeElement(id);
  }

  bringToFront(): void {
    const id = this.selectedId();
    if (!id) return;

    this.mutate((s) => {
      const idx = s.elements.findIndex((e) => e.id === id);
      if (idx === -1 || idx === s.elements.length - 1) return {};

      const elements = [...s.elements];
      const [el] = elements.splice(idx, 1);
      elements.push(el);
      return { elements };
    });
  }

  sendToBack(): void {
    const id = this.selectedId();
    if (!id) return;

    this.mutate((s) => {
      const idx = s.elements.findIndex((e) => e.id === id);
      if (idx <= 0) return {};

      const elements = [...s.elements];
      const [el] = elements.splice(idx, 1);
      elements.unshift(el);
      return { elements };
    });
  }

  shapeLabel(shape: PlatingSchemaShape): string {
    return SHAPE_LABELS[shape];
  }

  /** `shape` seul ne distingue plus rond et ovale (les deux sont des `ellipse`) — l'icône du
   * bouton d'ajout se base donc sur le ratio largeur/hauteur du préréglage. */
  presetSwatchKind(preset: ElementPreset): 'round' | 'oval' | 'rect' {
    if (preset.shape === 'rect') return 'rect';
    return preset.width === preset.height ? 'round' : 'oval';
  }

  select(id: string): void {
    this.selectedId.set(id);
  }

  deselect(): void {
    this.selectedId.set(null);
  }

  updateSelected(patch: Partial<PlatingSchemaElement>): void {
    const id = this.selectedId();
    if (!id) return;

    this.mutate((s) => ({ elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  onLabelInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.updateSelected({ label: value || null });
  }

  onColorInput(event: Event): void {
    this.updateSelected({ color: (event.target as HTMLInputElement).value });
  }

  onWidthInput(event: Event): void {
    this.updateSelected({ width: Number((event.target as HTMLInputElement).value) });
  }

  onHeightInput(event: Event): void {
    this.updateSelected({ height: Number((event.target as HTMLInputElement).value) });
  }

  onRotationInput(event: Event): void {
    this.updateSelected({ rotation: this.snapRotation(Number((event.target as HTMLInputElement).value)) });
  }

  onElementPointerDown(event: PointerEvent, id: string): void {
    if (this.disabled()) return;

    event.stopPropagation();
    this.select(id);
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    this.dragging = { id, pointerId: event.pointerId, mode: 'move' };
  }

  /** Poignées de redimensionnement/rotation posées sur l'élément sélectionné — même capture de
   * pointeur que le déplacement, mais `onElementPointerMove` dérive une taille/rotation au lieu
   * d'une position. */
  onHandlePointerDown(
    event: PointerEvent,
    id: string,
    mode: 'scale' | 'resize-width' | 'resize-height' | 'rotate',
  ): void {
    if (this.disabled()) return;

    event.stopPropagation();
    this.select(id);
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    this.dragging = { id, pointerId: event.pointerId, mode };
  }

  onElementPointerMove(event: PointerEvent): void {
    const drag = this.dragging;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rect = this.plate().nativeElement.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 100;
    const py = ((event.clientY - rect.top) / rect.height) * 100;

    if (drag.mode === 'move') {
      this.updateSelected({
        x: this.snapToGrid(this.clamp(px, 0, 100)),
        y: this.snapToGrid(this.clamp(py, 0, 100)),
      });
      return;
    }

    const element = this.selectedElement();
    if (!element) return;

    if (drag.mode === 'rotate') {
      const angle = Math.atan2(py - element.y, px - element.x) * (180 / Math.PI);
      this.updateSelected({ rotation: this.snapRotation(this.normalizeAngle(angle + 90)) });
      return;
    }

    // Les poignées de redimensionnement sont posées sur le même groupe SVG tourné que la forme
    // (voir template) : on ramène donc le pointeur dans le repère local de l'élément (rotation
    // inverse) avant de lire sa position le long des axes — sans ça, tourner l'élément
    // inverserait le sens du redimensionnement.
    const rad = (-element.rotation * Math.PI) / 180;
    const dx = px - element.x;
    const dy = py - element.y;
    const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

    if (drag.mode === 'resize-width') {
      this.updateSelected({ width: this.clamp(Math.round((localX - 5) * 2), 4, 100) });
      return;
    }

    if (drag.mode === 'resize-height') {
      this.updateSelected({ height: this.clamp(Math.round((localY - 5) * 2), 4, 100) });
      return;
    }

    // scale (proportionnel, poignée de coin) : fait varier la largeur comme la poignée dédiée,
    // puis applique le même ratio à la hauteur pour garder les proportions courantes.
    const newWidth = this.clamp(Math.round((localX - 5) * 2), 4, 100);
    const ratio = element.width > 0 ? newWidth / element.width : 1;
    this.updateSelected({ width: newWidth, height: this.clamp(Math.round(element.height * ratio), 4, 100) });
  }

  onElementPointerUp(event: PointerEvent): void {
    if (!this.dragging || this.dragging.pointerId !== event.pointerId) return;
    this.dragging = null;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private snapToGrid(value: number): number {
    return Math.round(value / GRID_STEP) * GRID_STEP;
  }

  private snapRotation(angle: number): number {
    return Math.round(angle / ROTATION_STEP) * ROTATION_STEP;
  }

  /** Ramène un angle en degrés dans [-180, 180], arrondi à l'entier (même granularité que le
   * curseur de rotation). */
  private normalizeAngle(angle: number): number {
    let a = Math.round(angle) % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;
    return a;
  }

  /** Fusionne un patch partiel sur le schéma courant (plutôt que de le remplacer) — sans ça, un
   * appelant qui ne touche qu'aux éléments (la quasi-totalité des mutations) effacerait `plate`
   * à chaque déplacement/ajout/suppression. */
  private mutate(fn: (s: PlatingSchema) => Partial<PlatingSchema>): void {
    const next = { ...this.schema(), ...fn(this.schema()) };
    this.schema.set(next);
    this.onChange(next);
    this.onTouched();
  }
}
