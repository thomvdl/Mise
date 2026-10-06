import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { LabelListService } from '../../core/services/label-list.service';
import { LabelQueueService } from '../../core/services/label-queue.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { LabelTypeService } from '../../core/services/label-type.service';
import { LabelList, LabelListItem } from '../../core/models/label-list.model';
import { LabelType } from '../../core/models/label.model';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import { LabelIcon } from '../../components/label-icon/label-icon';

const PRODUCT_NAME_MAX_LENGTH = 100;
const MAX_ITEM_QUANTITY = 10;
const DATE_OFFSETS = [0, 1, 2, 3, 4, 5];
/** Repli le temps que les types se chargent depuis l'API — voir labels.ts pour le même principe. */
const PLACEHOLDER_TYPE: LabelType = { key: '', title: '…' };

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

/**
 * Listes nommées et réutilisables de produits à étiqueter (ex. "Mise en place du lundi") — CRUD
 * complet ouvert à tout utilisateur connecté (suppression réservée à l'admin côté API). Imprimer
 * une liste (en tout ou en partie, via les cases à cocher) ajoute la sélection à la file
 * d'impression partagée (LabelQueueService) avec date du jour et DLC recalculée depuis le type,
 * puis renvoie sur /etiquettes pour l'imprimer avec les mêmes outils (Zebra/navigateur) que le
 * reste de l'app — pas de second chemin d'impression à maintenir.
 */
@Component({
  selector: 'app-label-lists',
  imports: [RouterLink, NgTemplateOutlet, ConfirmDialog, LabelIcon],
  templateUrl: './label-lists.html',
  styleUrl: './label-lists.css',
})
export class LabelLists implements OnInit {
  private readonly labelListService = inject(LabelListService);
  private readonly ingredientService = inject(IngredientService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly labelTypeService = inject(LabelTypeService);
  private readonly router = inject(Router);
  readonly labelQueue = inject(LabelQueueService);

  private readonly ingredients = toSignal(this.ingredientService.list(), { initialValue: [] });
  private readonly ficheTechniques = toSignal(this.ficheTechniqueService.list(), { initialValue: [] });

  readonly labelTypes = toSignal(this.labelTypeService.list(), { initialValue: [] as LabelType[] });
  readonly productNameMaxLength = PRODUCT_NAME_MAX_LENGTH;
  readonly dateOffsets = DATE_OFFSETS;

  lists = signal<LabelList[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  /** Liste dépliée en lecture (sélection avant impression), ou null. */
  expandedId = signal<number | null>(null);
  /** Liste en cours d'édition ('new' = création), ou null. */
  editingId = signal<number | 'new' | null>(null);

  editName = signal('');
  editItems = signal<LabelListItem[]>([]);
  newItemType = signal<LabelType>(PLACEHOLDER_TYPE);
  newItemName = signal('');
  newItemQty = signal(1);
  /** `null` = garder le décalage par défaut du type choisi (voir addSelectionToQueue). */
  newItemOffset = signal<number | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);

  /** Index des lignes cochées, dans la liste actuellement dépliée. */
  selectedIndexes = signal<Set<number>>(new Set());

  pendingDelete = signal<LabelList | null>(null);

  suggestions = computed(() => {
    const names = new Set<string>();
    for (const ingredient of this.ingredients()) names.add(ingredient.name);
    for (const fiche of this.ficheTechniques()) names.add(fiche.name);
    return [...names].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  });

  canSave = computed(() => this.editName().trim().length > 0 && this.editItems().length > 0);
  selectedCount = computed(() => this.selectedIndexes().size);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.labelListService.list().subscribe({
      next: (lists) => {
        this.lists.set(lists);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les listes.');
        this.loading.set(false);
      },
    });
  }

  itemTypeTitle(typeKey: string): string {
    return this.labelTypes().find((t) => t.key === typeKey)?.title ?? typeKey;
  }

  itemTypeIcon(typeKey: string): string | undefined {
    return this.labelTypes().find((t) => t.key === typeKey)?.iconKey;
  }

  // --- Lecture / sélection avant impression ---

  toggleExpand(list: LabelList): void {
    if (this.expandedId() === list.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(list.id);
    this.editingId.set(null);
    this.selectAll(list);
  }

  isSelected(index: number): boolean {
    return this.selectedIndexes().has(index);
  }

  toggleSelected(index: number): void {
    const next = new Set(this.selectedIndexes());
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    this.selectedIndexes.set(next);
  }

  selectAll(list: LabelList): void {
    this.selectedIndexes.set(new Set(list.items.map((_, index) => index)));
  }

  selectNone(): void {
    this.selectedIndexes.set(new Set());
  }

  /** Ajoute les lignes cochées à la file d'impression (date du jour) puis bascule sur
   * /etiquettes pour les imprimer. DLC : `use_by_offset_days` de la ligne si renseigné, sinon le
   * décalage par défaut du type — voir LabelListItem. */
  addSelectionToQueue(list: LabelList): void {
    const selected = list.items.filter((_, index) => this.selectedIndexes().has(index));
    if (selected.length === 0) return;

    const today = toIsoDate(new Date());

    const types = this.labelTypes();
    this.labelQueue.addMany(
      selected.map((item) => {
        const type = types.find((t) => t.key === item.type_key) ?? types[0];
        const offset = item.use_by_offset_days ?? type.defaultShelfLifeDays;
        return {
          type,
          productName: item.product_name,
          date: today,
          useByDate: offset !== undefined && offset !== null ? isoDateWithOffset(offset) : null,
          quantity: item.quantity,
        };
      }),
    );

    this.router.navigate(['/etiquettes']);
  }

  // --- Création / édition ---

  onListNameInput(event: Event): void {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  startCreate(): void {
    this.expandedId.set(null);
    this.editingId.set('new');
    this.editName.set('');
    this.editItems.set([]);
    this.resetComposer();
    this.saveError.set(null);
  }

  startEdit(list: LabelList): void {
    this.expandedId.set(null);
    this.editingId.set(list.id);
    this.editName.set(list.name);
    this.editItems.set(list.items.map((item) => ({ ...item })));
    this.resetComposer();
    this.saveError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  private resetComposer(): void {
    this.newItemType.set(this.labelTypes()[0] ?? PLACEHOLDER_TYPE);
    this.newItemName.set('');
    this.newItemQty.set(1);
    this.newItemOffset.set(null);
  }

  selectNewItemType(type: LabelType): void {
    this.newItemType.set(type);
  }

  selectNewItemOffset(offset: number | null): void {
    this.newItemOffset.set(offset);
  }

  onNewItemNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.newItemName.set(value.slice(0, PRODUCT_NAME_MAX_LENGTH));
  }

  incrementNewItemQty(): void {
    this.newItemQty.update((qty) => Math.min(qty + 1, MAX_ITEM_QUANTITY));
  }

  decrementNewItemQty(): void {
    this.newItemQty.update((qty) => Math.max(qty - 1, 1));
  }

  addEditItem(): void {
    const name = this.newItemName().trim();
    if (!name) return;

    this.editItems.update((items) => [
      ...items,
      {
        type_key: this.newItemType().key,
        product_name: name,
        quantity: this.newItemQty(),
        use_by_offset_days: this.newItemOffset(),
      },
    ]);
    this.newItemName.set('');
    this.newItemQty.set(1);
    this.newItemOffset.set(null);
  }

  /** Libellé affiché pour la DLC d'une ligne — explicite si renseignée, sinon rappelle qu'elle
   * suit le défaut du type. */
  offsetLabel(offset: number | null): string {
    if (offset === null || offset === undefined) return 'DLC par défaut du type';
    return offset === 0 ? "DLC aujourd'hui" : `DLC J+${offset}`;
  }

  removeEditItem(index: number): void {
    this.editItems.update((items) => items.filter((_, i) => i !== index));
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;

    const editingId = this.editingId();
    const payload = {
      name: this.editName().trim(),
      items: this.editItems().map((item) => ({
        type_key: item.type_key,
        product_name: item.product_name,
        quantity: item.quantity,
        use_by_offset_days: item.use_by_offset_days,
      })),
    };

    this.saving.set(true);
    this.saveError.set(null);

    const request =
      editingId === 'new' ? this.labelListService.create(payload) : this.labelListService.update(editingId!, payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editingId.set(null);
        this.reload();
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }

  // --- Suppression ---

  confirmDelete(list: LabelList): void {
    this.pendingDelete.set(list);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const list = this.pendingDelete();
    if (!list) return;

    this.labelListService.delete(list.id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        if (this.expandedId() === list.id) this.expandedId.set(null);
        this.reload();
      },
      error: () => {
        this.pendingDelete.set(null);
        this.errorMessage.set("Suppression impossible (réservée à l'administrateur).");
      },
    });
  }
}
