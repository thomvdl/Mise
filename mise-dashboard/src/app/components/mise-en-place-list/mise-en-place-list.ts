import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { MiseEnPlaceClassification, MiseEnPlaceItemService } from '../../core/services/mise-en-place-item.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { EventService } from '../../core/services/event.service';
import { MiseEnPlaceItem, MiseEnPlaceStatus, MiseEnPlaceUrgency } from '../../core/models/mise-en-place-item.model';
import { Station } from '../../core/models/station.model';
import { Group } from '../../core/models/group.model';
import { CalendarEvent } from '../../core/models/calendar-event.model';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { FicheTechniqueSearchSelect } from '../fiche-technique-search-select/fiche-technique-search-select';
import { IngredientCategory } from '../../core/models/ingredient-category.model';
import { MerchandiseEntry, MerchandiseLine, merchandiseList } from '../../core/utils/merchandise-list';
import { formatQuantity } from '../../core/utils/format-quantity';
import { todayDDMMYYYY, useReportTitle } from '../../core/utils/report-title';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { DatetimePicker } from '../datetime-picker/datetime-picker';

type ClassificationKind = 'station' | 'group' | 'event';

interface MerchandiseGroup {
  category: string;
  lines: MerchandiseLine[];
}

/** Encode un type + id en une seule valeur `<option>` (ex. "station:3"), pour piloter un unique
 * `<select>` à la fois sur le formulaire d'ajout et sur le filtre, au lieu de jongler avec trois
 * listes déroulantes indépendantes. */
function encodeClassification(kind: ClassificationKind, id: number): string {
  return `${kind}:${id}`;
}

function decodeClassification(value: string): { kind: ClassificationKind; id: number } | null {
  const [kind, id] = value.split(':');
  if (kind !== 'station' && kind !== 'group' && kind !== 'event') return null;
  const numericId = Number(id);
  return Number.isFinite(numericId) ? { kind, id: numericId } : null;
}

/** `start_date`/`end_date` sont des dates `Y-m-d` — comparables telles quelles en chaîne. */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-mise-en-place-list',
  imports: [FormsModule, DatePipe, RouterLink, ConfirmDialog, DatetimePicker, FicheTechniqueSearchSelect],
  templateUrl: './mise-en-place-list.html',
  styleUrl: './mise-en-place-list.css',
})
export class MiseEnPlaceList implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly miseEnPlaceItemService = inject(MiseEnPlaceItemService);
  private readonly stationService = new SimpleEntityService<Station>(inject(HttpClient), 'stations');
  private readonly groupService = new SimpleEntityService<Group>(inject(HttpClient), 'groups');
  private readonly ingredientCategoryService = new SimpleEntityService<IngredientCategory>(
    inject(HttpClient),
    'ingredient-categories',
  );
  private readonly eventService = inject(EventService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  readonly isAdmin = this.auth.isAdmin();

  items = signal<MiseEnPlaceItem[]>([]);
  stations = signal<Station[]>([]);
  groups = signal<Group[]>([]);
  events = signal<CalendarEvent[]>([]);
  fiches = signal<FicheTechnique[]>([]);
  ingredientCategories = signal<IngredientCategory[]>([]);

  /** Poste de la liste de marchandise — `''` = tous les postes. */
  merchandiseStationId = signal('');

  newItemName = signal('');
  /** `''` tant qu'aucune option n'est choisie dans le select combiné station/groupe/événement. */
  newItemClassification = signal('');
  newItemDeadline = signal('');
  newItemUrgency = signal<MiseEnPlaceUrgency>('moyenne');
  /** `null` tant qu'aucune fiche n'est choisie — la fiche est optionnelle (tâche libre sinon). */
  newItemFicheId = signal<number | null>(null);
  newItemServings = signal<number | null>(null);
  pendingDelete = signal<MiseEnPlaceItem | null>(null);
  pendingClearAll = signal(false);
  /** Tâche en attente de confirmation avant d'être marquée faite. */
  pendingComplete = signal<MiseEnPlaceItem | null>(null);

  filterClassification = signal('');
  filterStatus = signal<MiseEnPlaceStatus | null>('todo');

  /** Le sélecteur d'événement ne propose que ceux encore pertinents pour la mise en place à
   * venir : ni déjà terminés, ni trop lointains (plus de J+7) — sans ça, la liste grossit sans
   * fin avec des événements passés ou hors de portée de planification. */
  upcomingEvents = computed(() => {
    const today = toDateString(new Date());
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    const max = toDateString(maxDate);

    return this.events().filter((e) => e.end_date >= today && e.start_date <= max);
  });

  canAdd = computed(() => {
    const servings = this.newItemServings();
    const servingsOk = this.newItemFicheId() === null || (servings !== null && servings >= 1);
    return this.newItemName().trim().length > 0 && this.newItemClassification() !== '' && servingsOk;
  });

  filteredItems = computed(() => {
    const classification = decodeClassification(this.filterClassification());
    const status = this.filterStatus();

    return this.items().filter((item) => {
      const matchesClassification =
        !classification ||
        (classification.kind === 'station' && item.station?.id === classification.id) ||
        (classification.kind === 'group' && item.group?.id === classification.id) ||
        (classification.kind === 'event' && item.event?.id === classification.id);
      const matchesStatus = status === null || item.status === status;
      return matchesClassification && matchesStatus;
    });
  });

  /** Tâches à faire liées à une fiche, rattachées à leur poste : la station de la tâche, ou à
   * défaut (tâche classée par groupe/événement) celle de la fiche. La fiche complète est reprise
   * de `fiches()` (ingrédients + sous-recettes chargés), pas de la version allégée de la tâche. */
  private readonly merchandiseTasks = computed(() => {
    const fichesById = new Map(this.fiches().map((fiche) => [fiche.id, fiche]));

    return this.items().flatMap((item) => {
      const fiche = item.fiche_technique ? fichesById.get(item.fiche_technique.id) : undefined;
      if (item.status !== 'todo' || !fiche || !item.servings) return [];
      return [{ item, fiche, servings: item.servings, stationId: item.station?.id ?? fiche.station_id }];
    });
  });

  /** Postes réellement présents dans les tâches liées à une fiche — inutile de proposer les autres. */
  merchandiseStations = computed(() => {
    const ids = new Set(this.merchandiseTasks().map((task) => task.stationId));
    return this.stations().filter((station) => ids.has(station.id));
  });

  merchandiseSelectedTasks = computed(() => {
    const stationId = this.merchandiseStationId();
    const tasks = this.merchandiseTasks();
    return stationId === '' ? tasks : tasks.filter((task) => task.stationId === Number(stationId));
  });

  /** Ingrédients regroupés par famille (produits laitiers, légumes…), dans l'ordre alphabétique —
   * l'ordre dans lequel on passe commande ou on fait le tour des chambres froides. */
  merchandiseGroups = computed<MerchandiseGroup[]>(() => {
    const entries: MerchandiseEntry[] = this.merchandiseSelectedTasks().map(({ fiche, servings }) => ({ fiche, servings }));
    const lines = merchandiseList(entries, new Map(this.fiches().map((fiche) => [fiche.id, fiche])));
    const categoryNames = new Map(this.ingredientCategories().map((category) => [category.id, category.name]));

    const groups = new Map<string, MerchandiseLine[]>();
    for (const line of lines) {
      const category = categoryNames.get(line.ingredient.ingredient_category_id ?? -1) ?? 'Autres';
      groups.set(category, [...(groups.get(category) ?? []), line]);
    }

    return [...groups.entries()]
      .map(([category, groupLines]) => ({
        category,
        lines: groupLines.sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, 'fr')),
      }))
      .sort((a, b) =>
        a.category === 'Autres' ? 1 : b.category === 'Autres' ? -1 : a.category.localeCompare(b.category, 'fr'),
      );
  });

  merchandiseStationLabel = computed(() => {
    const stationId = this.merchandiseStationId();
    if (stationId === '') return 'Tous les postes';
    return this.stations().find((station) => station.id === Number(stationId))?.name ?? 'Poste';
  });

  /** N'imprime que la liste de marchandise (le reste de la page est `no-print`), pour le poste
   * sélectionné. Le titre du document sert de nom de fichier par défaut en "Enregistrer en PDF". */
  printMerchandise(): void {
    this.setReportTitle(`Liste de marchandise — ${this.merchandiseStationLabel()} — ${todayDDMMYYYY()}`);
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

  onMerchandiseStationChange(event: Event): void {
    this.merchandiseStationId.set((event.target as HTMLSelectElement).value);
  }

  formatQuantity = formatQuantity;

  ngOnInit(): void {
    this.reload();
    this.stationService.list().subscribe((stations) => this.stations.set(stations));
    this.groupService.list().subscribe((groups) => this.groups.set(groups));
    this.ingredientCategoryService.list().subscribe((categories) => this.ingredientCategories.set(categories));
    this.eventService.listAll().subscribe((events) => this.events.set(events));
    this.ficheTechniqueService
      .list()
      .subscribe((fiches) => this.fiches.set([...fiches].sort((a, b) => a.name.localeCompare(b.name, 'fr'))));
  }

  reload(): void {
    this.miseEnPlaceItemService.list().subscribe((items) => this.items.set([...items].reverse()));
  }

  encodeClassification = encodeClassification;

  onNewItemClassificationChange(event: Event): void {
    this.newItemClassification.set((event.target as HTMLSelectElement).value);
  }

  onNewItemUrgencyChange(event: Event): void {
    this.newItemUrgency.set((event.target as HTMLSelectElement).value as MiseEnPlaceUrgency);
  }

  /** Choisir une fiche pré-remplit les portions avec celles de la fiche (à ajuster ensuite) et,
   * si le champ est encore vide, le nom de la tâche avec le nom de la fiche. */
  onNewItemFicheChange(ficheId: number | null): void {
    this.newItemFicheId.set(ficheId);

    const fiche = this.fiches().find((f) => f.id === ficheId);
    this.newItemServings.set(fiche ? fiche.servings : null);
    if (fiche && this.newItemName().trim() === '') {
      this.newItemName.set(fiche.name);
    }
  }

  onFilterClassificationChange(event: Event): void {
    this.filterClassification.set((event.target as HTMLSelectElement).value);
  }

  onFilterStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStatus.set(value ? (value as MiseEnPlaceStatus) : null);
  }

  /** Label affiché dans la colonne "Classification" du tableau — le badge station/groupe utilise
   * sa couleur, l'événement n'en a pas donc reste un simple libellé. */
  classificationLabel(item: MiseEnPlaceItem): string {
    return item.station?.name ?? item.group?.name ?? item.event?.name ?? '—';
  }

  classificationColor(item: MiseEnPlaceItem): string | null {
    return item.station?.color ?? item.group?.color ?? null;
  }

  addItem(): void {
    const name = this.newItemName().trim();
    const classification = decodeClassification(this.newItemClassification());
    const deadline = this.newItemDeadline();
    const ficheId = this.newItemFicheId();
    const servings = this.newItemServings();
    if (!name || !classification) return;
    if (ficheId !== null && (servings === null || servings < 1)) return;
    const fiche = ficheId !== null && servings !== null ? { id: ficheId, servings } : null;

    this.miseEnPlaceItemService
      .create(name, classification as MiseEnPlaceClassification, deadline || null, this.newItemUrgency(), fiche)
      .subscribe(() => {
        this.newItemName.set('');
        this.newItemClassification.set('');
        this.newItemDeadline.set('');
        this.newItemUrgency.set('moyenne');
        this.newItemFicheId.set(null);
        this.newItemServings.set(null);
        this.reload();
      });
  }

  /** Repasser une tâche déjà faite à "à faire" ne perd rien de définitif — s'applique directement,
   * sans confirmation (contrairement à confirmComplete, irréversible via cette vue). */
  markTodo(item: MiseEnPlaceItem): void {
    this.miseEnPlaceItemService.updateStatus(item.id, 'todo').subscribe(() => this.reload());
  }

  confirmComplete(item: MiseEnPlaceItem): void {
    this.pendingComplete.set(item);
  }

  cancelComplete(): void {
    this.pendingComplete.set(null);
  }

  completeConfirmed(): void {
    const item = this.pendingComplete();
    if (!item) return;

    this.miseEnPlaceItemService.updateStatus(item.id, 'done').subscribe(() => {
      this.pendingComplete.set(null);
      this.reload();
    });
  }

  confirmDelete(item: MiseEnPlaceItem): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.miseEnPlaceItemService.delete(item.id).subscribe(() => {
      this.pendingDelete.set(null);
      this.reload();
    });
  }

  confirmClearAll(): void {
    this.pendingClearAll.set(true);
  }

  cancelClearAll(): void {
    this.pendingClearAll.set(false);
  }

  clearAllConfirmed(): void {
    const ids = this.items().map((item) => item.id);
    if (ids.length === 0) {
      this.pendingClearAll.set(false);
      return;
    }

    forkJoin(ids.map((id) => this.miseEnPlaceItemService.delete(id))).subscribe(() => {
      this.pendingClearAll.set(false);
      this.reload();
    });
  }
}
