import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { IngredientService } from '../../core/services/ingredient.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { AuthService } from '../../core/services/auth.service';
import { LABEL_TYPES, LabelType, QueuedLabel } from '../../core/models/label.model';

const PRODUCT_NAME_MAX_LENGTH = 55;
const MIN_PRINT_QUANTITY = 1;
const MAX_PRINT_QUANTITY = 10;

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isoDateWithOffset(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return toIsoDate(date);
}

function formatIsoDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

@Component({
  selector: 'app-labels',
  imports: [],
  templateUrl: './labels.html',
  styleUrl: './labels.css',
})
export class Labels {
  private readonly route = inject(ActivatedRoute);
  private readonly ingredientService = inject(IngredientService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly auth = inject(AuthService);

  private readonly ingredients = toSignal(this.ingredientService.list(), { initialValue: [] });
  private readonly ficheTechniques = toSignal(this.ficheTechniqueService.list(), { initialValue: [] });

  private nextId = 0;

  readonly labelTypes = LABEL_TYPES;
  readonly dateOffsets = [0, 1, 2, 3, 4, 5];
  readonly productNameMaxLength = PRODUCT_NAME_MAX_LENGTH;

  selectedType = signal<LabelType>(LABEL_TYPES[0]);
  productName = signal('');
  date = signal(toIsoDate(new Date()));
  /** ISO date, or '' when this label has no DLC (Date Limite de Consommation). */
  useByDate = signal(LABEL_TYPES[0].defaultShelfLifeDays ? isoDateWithOffset(LABEL_TYPES[0].defaultShelfLifeDays) : '');
  /** Number of copies of the label being composed to add to the queue at once (1-10). */
  printQuantity = signal(MIN_PRINT_QUANTITY);
  queue = signal<QueuedLabel[]>([]);

  currentUserName = computed(() => this.auth.user()?.name ?? '');

  /** Product names pulled from the catalogs, offered as suggestions — the field itself stays free text. */
  suggestions = computed(() => {
    const names = new Set<string>();
    for (const ingredient of this.ingredients()) names.add(ingredient.name);
    for (const fiche of this.ficheTechniques()) names.add(fiche.name);
    return [...names].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  });

  formattedDate = computed(() => formatIsoDate(this.date()));
  formattedUseByDate = computed(() => formatIsoDate(this.useByDate()));

  /** Total physical labels queued, copies included. */
  totalLabelCount = computed(() => this.queue().reduce((sum, item) => sum + item.quantity, 0));

  constructor() {
    const produit = this.route.snapshot.queryParamMap.get('produit');
    if (produit) {
      this.productName.set(produit.slice(0, PRODUCT_NAME_MAX_LENGTH));
      // Arriving from a fiche technique detail page: "this dish was made today" is the
      // natural default, rather than whichever type happened to be first in the list.
      const producedType = LABEL_TYPES.find((type) => type.key === 'produit');
      if (producedType) this.selectType(producedType);
    }
  }

  selectType(type: LabelType): void {
    this.selectedType.set(type);
    this.useByDate.set(type.defaultShelfLifeDays ? isoDateWithOffset(type.defaultShelfLifeDays) : '');
  }

  onNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.productName.set(value.slice(0, PRODUCT_NAME_MAX_LENGTH));
  }

  onUseByDateInput(event: Event): void {
    this.useByDate.set((event.target as HTMLInputElement).value);
  }

  clearUseByDate(): void {
    this.useByDate.set('');
  }

  setUseByDateOffset(daysFromToday: number): void {
    this.useByDate.set(isoDateWithOffset(daysFromToday));
  }

  isUseByDateOffsetActive(daysFromToday: number): boolean {
    return this.useByDate() === isoDateWithOffset(daysFromToday);
  }

  incrementQuantity(): void {
    this.printQuantity.update((qty) => Math.min(qty + 1, MAX_PRINT_QUANTITY));
  }

  decrementQuantity(): void {
    this.printQuantity.update((qty) => Math.max(qty - 1, MIN_PRINT_QUANTITY));
  }

  /** Adds the label being composed to the print queue (with its chosen quantity), then resets name/quantity for the next one. */
  addToQueue(): void {
    const name = this.productName().trim();
    if (!name) return;

    this.queue.update((items) => [
      ...items,
      {
        id: this.nextId++,
        type: this.selectedType(),
        productName: name,
        date: this.date(),
        useByDate: this.useByDate() || null,
        quantity: this.printQuantity(),
        madeBy: this.currentUserName(),
      },
    ]);
    this.productName.set('');
    this.printQuantity.set(MIN_PRINT_QUANTITY);
  }

  removeFromQueue(id: number): void {
    this.queue.update((items) => items.filter((item) => item.id !== id));
  }

  clearQueue(): void {
    this.queue.set([]);
  }

  formatDate(value: string): string {
    return formatIsoDate(value);
  }
}
