import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { IngredientService } from '../../core/services/ingredient.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { LabelQueueService } from '../../core/services/label-queue.service';
import { LabelTypeService } from '../../core/services/label-type.service';
import { LabelType } from '../../core/models/label.model';
import { LabelIcon } from '../../components/label-icon/label-icon';
import { BarcodeLookupDialog } from '../../components/barcode-lookup-dialog/barcode-lookup-dialog';

/** Le temps que les types se chargent depuis l'API, un repli vide évite de parsemer le template
 *  de gardes null — remplacé par le vrai premier type dès que la liste arrive (voir l'effect). */
const PLACEHOLDER_TYPE: LabelType = { key: '', title: '…' };

const PRODUCT_NAME_MAX_LENGTH = 100;
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
  imports: [RouterLink, LabelIcon, BarcodeLookupDialog],
  templateUrl: './labels.html',
  styleUrl: './labels.css',
})
export class Labels {
  private readonly route = inject(ActivatedRoute);
  private readonly ingredientService = inject(IngredientService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly labelTypeService = inject(LabelTypeService);
  /** File d'impression partagée avec /etiquettes/listes — voir LabelQueueService. */
  readonly labelQueue = inject(LabelQueueService);

  private readonly ingredients = toSignal(this.ingredientService.list(), { initialValue: [] });
  private readonly ficheTechniques = toSignal(this.ficheTechniqueService.list(), { initialValue: [] });

  readonly labelTypes = toSignal(this.labelTypeService.list(), { initialValue: [] as LabelType[] });
  readonly dateOffsets = [0, 1, 2, 3, 4, 5];
  readonly productNameMaxLength = PRODUCT_NAME_MAX_LENGTH;

  selectedType = signal<LabelType>(PLACEHOLDER_TYPE);
  productName = signal('');
  date = signal(toIsoDate(new Date()));
  /** ISO date, or '' when this label has no DLC (Date Limite de Consommation). */
  useByDate = signal('');
  /** Number of copies of the label being composed to add to the queue at once (1-10). */
  printQuantity = signal(MIN_PRINT_QUANTITY);

  /** Product names pulled from the catalogs, offered as suggestions — the field itself stays free text. */
  suggestions = computed(() => {
    const names = new Set<string>();
    for (const ingredient of this.ingredients()) names.add(ingredient.name);
    for (const fiche of this.ficheTechniques()) names.add(fiche.name);
    return [...names].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  });

  constructor() {
    const produit = this.route.snapshot.queryParamMap.get('produit');
    if (produit) {
      this.productName.set(produit.slice(0, PRODUCT_NAME_MAX_LENGTH));
    }

    // Les types arrivent de façon asynchrone (API) — on choisit le premier dès qu'ils sont là,
    // une seule fois (tant que le placeholder est encore actif). Arrivée depuis une fiche
    // technique (`produit` en query param) : "fabriqué aujourd'hui" est le défaut naturel plutôt
    // que le premier type de la liste, peu importe son ordre.
    effect(() => {
      const types = this.labelTypes();
      if (types.length === 0 || this.selectedType().key !== '') return;

      const preferred = produit ? types.find((type) => type.key === 'produit') : undefined;
      this.selectType(preferred ?? types[0]);
    });
  }

  selectType(type: LabelType): void {
    this.selectedType.set(type);
    this.useByDate.set(type.defaultShelfLifeDays ? isoDateWithOffset(type.defaultShelfLifeDays) : '');
  }

  /** Appelé quand le dialogue code-barres trouve un produit — voir BarcodeLookupDialog. */
  onBarcodeFound(name: string): void {
    this.productName.set(name.slice(0, PRODUCT_NAME_MAX_LENGTH));
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
    if (!name || this.selectedType().key === '') return;

    this.labelQueue.add({
      type: this.selectedType(),
      productName: name,
      date: this.date(),
      useByDate: this.useByDate() || null,
      quantity: this.printQuantity(),
    });
    this.productName.set('');
    this.printQuantity.set(MIN_PRINT_QUANTITY);
  }

  formatDate(value: string): string {
    return formatIsoDate(value);
  }

  /** Décalage en jours entre la date de fabrication et la DLC d'une entrée de la file — recalculé
   * à l'affichage plutôt que stocké, pour rester correct même pour les entrées composées
   * manuellement (où seules les deux dates existent, pas un décalage explicite). */
  offsetDays(date: string, useByDate: string): number {
    const [y1, m1, d1] = date.split('-').map(Number);
    const [y2, m2, d2] = useByDate.split('-').map(Number);
    const from = new Date(y1, m1 - 1, d1);
    const to = new Date(y2, m2 - 1, d2);
    return Math.round((to.getTime() - from.getTime()) / 86_400_000);
  }
}
