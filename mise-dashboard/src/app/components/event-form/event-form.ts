import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, switchMap } from 'rxjs';

import { EventService } from '../../core/services/event.service';
import { MenuService } from '../../core/services/menu.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import {
  CalendarEvent,
  CalendarEventPayload,
  EVENT_TYPES,
  EventPlat,
  MiseEnPlaceGenerationResult,
} from '../../core/models/calendar-event.model';
import { Station } from '../../core/models/station.model';
import { Menu } from '../../core/models/menu.model';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { IngredientCategory } from '../../core/models/ingredient-category.model';
import { Allergen } from '../../core/models/allergen.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { IngredientService } from '../../core/services/ingredient.service';
import { PlatAllergenCheck, checkPlatAllergens } from '../../core/utils/event-allergens';
import { MerchandiseEntry, MerchandiseLine, merchandiseList } from '../../core/utils/merchandise-list';
import { formatQuantity } from '../../core/utils/format-quantity';
import { useReportTitle } from '../../core/utils/report-title';
import { toIsoDate } from '../../core/utils/calendar-grid';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { DatetimePicker } from '../datetime-picker/datetime-picker';
import { FicheTechniqueSearchSelect } from '../fiche-technique-search-select/fiche-technique-search-select';

/** `menu` : les plats viennent du menu lié, seul le nombre de pax se règle ici.
 * `fiches` : le menu de l'événement est composé directement, une fiche technique par ligne. */
type CompositionMode = 'menu' | 'fiches';

interface PlatRow {
  key: number;
  name: string;
  pax: number;
  ficheIds: number[];
}

interface SectionRow {
  key: number;
  name: string;
  plats: PlatRow[];
}

interface MerchandiseGroup {
  category: string;
  lines: MerchandiseLine[];
}

const DEFAULT_SECTIONS = ['Entrée', 'Plat', 'Dessert'];

let nextKey = 1;

/** Répartit `total` le plus équitablement possible sur `count` plats (le reste va aux premiers). */
function splitEvenly(total: number, count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor(total / count);
  return Array.from({ length: count }, (_, i) => base + (i < total % count ? 1 : 0));
}

@Component({
  selector: 'app-event-form',
  imports: [FormsModule, RouterLink, ConfirmDialog, DatetimePicker, FicheTechniqueSearchSelect],
  templateUrl: './event-form.html',
  styleUrl: './event-form.css',
})
export class EventForm implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly menuService = inject(MenuService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly ingredientCategoryService = new SimpleEntityService<IngredientCategory>(
    inject(HttpClient),
    'ingredient-categories',
  );
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly stationService = new SimpleEntityService<Station>(inject(HttpClient), 'stations');
  private readonly allergenService = new SimpleEntityService<Allergen>(inject(HttpClient), 'allergens');
  private readonly ingredientService = inject(IngredientService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  readonly eventTypes = EVENT_TYPES;

  private readonly menuSelect = viewChild<ElementRef<HTMLSelectElement>>('menuSelect');

  editingEvent = signal<CalendarEvent | null>(null);
  menus = signal<Menu[]>([]);
  fiches = signal<FicheTechnique[]>([]);
  ingredientCategories = signal<IngredientCategory[]>([]);
  stations = signal<Station[]>([]);
  allergens = signal<Allergen[]>([]);
  private readonly ingredientsById = signal(new Map<number, Ingredient>());

  name = signal('');
  detail = signal('');
  horaire = signal('');
  couverts = signal<number | null>(null);
  type = signal<string | null>(null);
  /** Allergies du groupe : allergènes à éviter + détail libre. */
  allergenIds = signal<number[]>([]);
  allergiesNote = signal('');
  startDate = signal('');
  endDate = signal('');

  mode = signal<CompositionMode>('menu');
  menuId = signal<number | null>(null);
  sections = signal<SectionRow[]>([]);

  /** Fiche choisie dans le champ d'ajout de chaque section (mode `fiches`), par clé de section. */
  pendingFiche = signal<Record<number, number | null>>({});

  /** Changement de mode ou de menu en attente de confirmation — il remplacerait les plats saisis. */
  pendingReplace = signal<{ mode: CompositionMode; menuId: number | null } | null>(null);
  pendingDelete = signal(false);

  saving = signal(false);
  errorMessage = signal<string | null>(null);
  printingLabel = signal(false);
  printLabelError = signal<string | null>(null);

  isEdit = computed(() => this.editingEvent() !== null);

  groupAllergens = computed(() => this.allergens().filter((a) => this.allergenIds().includes(a.id)));

  /** Vérification de chaque plat face aux allergies du groupe, par clé de plat. Vide tant
   * qu'aucun allergène n'est signalé — rien à vérifier. */
  platChecks = computed(() => {
    const group = this.groupAllergens();
    const checks = new Map<number, PlatAllergenCheck>();
    if (group.length === 0) return checks;
    for (const section of this.sections()) {
      for (const plat of section.plats) {
        checks.set(plat.key, checkPlatAllergens(plat.ficheIds, group, this.fichesById(), this.ingredientsById()));
      }
    }
    return checks;
  });

  /** Résumé en tête de la section menu : plats à risque et plats impossibles à vérifier. */
  allergyAlerts = computed(() => {
    const checks = [...this.platChecks().values()];
    return {
      conflicts: checks.filter((c) => c.conflicts.length > 0).length,
      unverifiable: checks.filter((c) => c.unverifiable).length,
    };
  });

  /** Échéance (datetime-local) et urgence des tâches de mise en place à générer. L'échéance
   * suit la date de début (8 h le jour J) tant qu'on ne l'a pas changée à la main. */
  mepDeadline = signal<string | null>(null);
  mepUrgency = signal('moyenne');
  generating = signal(false);
  generationResult = signal<MiseEnPlaceGenerationResult | null>(null);

  generationMessage = computed(() => {
    const result = this.generationResult();
    if (!result) return null;
    const parts = [`${result.created} tâche(s) créée(s)`, `${result.updated} mise(s) à jour`];
    if (result.done) parts.push(`${result.done} déjà faite(s), non modifiée(s)`);
    return parts.join(', ');
  });

  effectiveDeadline = computed(() => this.mepDeadline() ?? (this.startDate() ? `${this.startDate()}T08:00` : ''));

  /** Aperçu des tâches qui seront créées : une par fiche, pax additionnés sur tous les plats qui
   * l'utilisent — même calcul que l'API (EventController::generateMiseEnPlace). */
  mepPreview = computed(() => {
    const fichesById = this.fichesById();
    const stationNames = new Map(this.stations().map((s) => [s.id, s.name]));
    const totals = new Map<number, number>();
    for (const section of this.sections()) {
      for (const plat of section.plats) {
        if (plat.pax <= 0) continue;
        for (const id of plat.ficheIds) totals.set(id, (totals.get(id) ?? 0) + plat.pax);
      }
    }
    return [...totals.entries()].map(([id, servings]) => {
      const fiche = fichesById.get(id);
      return {
        id,
        name: fiche?.name ?? 'Fiche supprimée',
        servings,
        station: fiche?.station_id ? (stationNames.get(fiche.station_id) ?? '') : '',
      };
    });
  });

  private readonly fichesById = computed(() => new Map(this.fiches().map((fiche) => [fiche.id, fiche])));

  selectedMenu = computed(() => this.menus().find((menu) => menu.id === this.menuId()) ?? null);

  hasPlats = computed(() => this.sections().some((section) => section.plats.length > 0));

  totalPax(section: SectionRow): number {
    return section.plats.reduce((sum, plat) => sum + (plat.pax || 0), 0);
  }

  /** Une section est « équilibrée » quand ses pax font exactement le nombre de couverts. */
  isBalanced(section: SectionRow): boolean {
    const couverts = this.couverts();
    return !couverts || this.totalPax(section) === couverts;
  }

  ficheName(id: number): string {
    return this.fichesById().get(id)?.name ?? 'Fiche supprimée';
  }

  /** Ingrédients de toutes les fiches de l'événement, chaque fiche mise à l'échelle des pax de
   * son plat — même calcul et même regroupement par famille que la liste de marchandise de la
   * mise en place. */
  merchandiseGroups = computed<MerchandiseGroup[]>(() => {
    const fichesById = this.fichesById();
    const entries: MerchandiseEntry[] = this.sections().flatMap((section) =>
      section.plats.flatMap((plat) =>
        plat.ficheIds
          .map((id) => fichesById.get(id))
          .filter((fiche): fiche is FicheTechnique => !!fiche && plat.pax > 0)
          .map((fiche) => ({ fiche, servings: plat.pax })),
      ),
    );
    const categoryNames = new Map(this.ingredientCategories().map((category) => [category.id, category.name]));

    const groups = new Map<string, MerchandiseLine[]>();
    for (const line of merchandiseList(entries, fichesById)) {
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

  ngOnInit(): void {
    this.menuService.list().subscribe((menus) => this.menus.set(menus));
    this.ficheTechniqueService.list().subscribe((fiches) => this.fiches.set(fiches));
    this.ingredientCategoryService.list().subscribe((categories) => this.ingredientCategories.set(categories));
    this.stationService.list().subscribe((stations) => this.stations.set(stations));
    this.allergenService.list().subscribe((allergens) => this.allergens.set(allergens));
    this.ingredientService
      .list()
      .subscribe((ingredients) => this.ingredientsById.set(new Map(ingredients.map((i) => [i.id, i]))));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.eventService.get(Number(idParam)).subscribe((event) => this.loadEvent(event));
    } else {
      // `?date=` : jour cliqué dans le calendrier.
      const date = this.route.snapshot.queryParamMap.get('date') ?? toIsoDate(new Date());
      this.startDate.set(date);
      this.endDate.set(date);
      this.mode.set('fiches');
      this.sections.set(this.defaultSections());
    }
  }

  private loadEvent(event: CalendarEvent): void {
    this.editingEvent.set(event);
    this.name.set(event.name);
    this.detail.set(event.detail ?? '');
    this.horaire.set(event.horaire ?? '');
    this.couverts.set(event.couverts);
    this.type.set(event.type);
    this.allergenIds.set((event.allergens ?? []).map((a) => a.id));
    this.allergiesNote.set(event.allergies_note ?? '');
    this.startDate.set(event.start_date);
    this.endDate.set(event.end_date);
    this.menuId.set(event.menu_id);
    this.mode.set(event.menu_id ? 'menu' : 'fiches');

    const plats = event.plats ?? [];
    if (plats.length > 0) {
      this.sections.set(this.sectionsFromEventPlats(plats));
    } else if (event.menu_id) {
      // Événement créé avant cette page : un menu lié mais aucun plat réparti — on recopie le menu.
      this.menuService.get(event.menu_id).subscribe((menu) => this.sections.set(this.sectionsFromMenu(menu)));
    } else {
      this.sections.set(this.defaultSections());
    }
  }

  /** Les plats arrivent à plat, triés par position : on regroupe les plats consécutifs d'une même section. */
  private sectionsFromEventPlats(plats: EventPlat[]): SectionRow[] {
    const sections: SectionRow[] = [];
    for (const plat of plats) {
      let section = sections.at(-1);
      if (!section || section.name !== plat.section) {
        section = { key: nextKey++, name: plat.section, plats: [] };
        sections.push(section);
      }
      section.plats.push({
        key: nextKey++,
        name: plat.name,
        pax: plat.pax,
        ficheIds: plat.fiche_techniques.map((fiche) => fiche.id),
      });
    }
    return sections;
  }

  /** Copie les sections/plats du menu, les couverts répartis équitablement entre les plats de
   * chaque section (le chef ajuste ensuite). */
  private sectionsFromMenu(menu: Menu): SectionRow[] {
    const couverts = this.couverts() ?? 0;
    return (menu.sections ?? []).map((section) => {
      const plats = section.plats ?? [];
      const split = splitEvenly(couverts, plats.length);
      return {
        key: nextKey++,
        name: section.name,
        plats: plats.map((plat, i) => ({
          key: nextKey++,
          name: plat.name,
          pax: split[i],
          ficheIds: (plat.fiche_techniques ?? []).map((fiche) => fiche.id),
        })),
      };
    });
  }

  private defaultSections(): SectionRow[] {
    return DEFAULT_SECTIONS.map((name) => ({ key: nextKey++, name, plats: [] }));
  }

  // --- Mode / menu -----------------------------------------------------------------------------

  setMode(mode: CompositionMode): void {
    if (mode === this.mode()) return;
    this.requestReplace({ mode, menuId: mode === 'menu' ? this.menuId() : null });
  }

  onMenuChange(value: string): void {
    this.requestReplace({ mode: 'menu', menuId: value ? Number(value) : null });
  }

  /** Recopie le menu lié, par exemple après l'avoir modifié. */
  reloadMenu(): void {
    this.requestReplace({ mode: 'menu', menuId: this.menuId() });
  }

  private requestReplace(next: { mode: CompositionMode; menuId: number | null }): void {
    if (this.hasPlats()) {
      this.pendingReplace.set(next);
    } else {
      this.applyReplace(next);
    }
  }

  confirmReplace(): void {
    const next = this.pendingReplace();
    this.pendingReplace.set(null);
    if (next) this.applyReplace(next);
  }

  cancelReplace(): void {
    this.pendingReplace.set(null);
    // Le <select> affiche déjà le menu refusé : on le remet sur le menu en cours.
    const select = this.menuSelect()?.nativeElement;
    if (select) select.value = String(this.menuId() ?? '');
  }

  private applyReplace({ mode, menuId }: { mode: CompositionMode; menuId: number | null }): void {
    this.mode.set(mode);
    this.menuId.set(menuId);

    if (mode === 'fiches') {
      this.sections.set(this.defaultSections());
      return;
    }

    const menu = this.menus().find((m) => m.id === menuId);
    this.sections.set(menu ? this.sectionsFromMenu(menu) : []);
  }

  toggleAllergen(id: number): void {
    this.allergenIds.update((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  // --- Sections / plats ------------------------------------------------------------------------

  private updateSection(sectionKey: number, fn: (section: SectionRow) => SectionRow): void {
    this.sections.update((sections) => sections.map((s) => (s.key === sectionKey ? fn(s) : s)));
  }

  setPax(sectionKey: number, platKey: number, value: number | null): void {
    const pax = Math.max(0, Math.round(Number(value) || 0));
    this.updateSection(sectionKey, (s) => ({
      ...s,
      plats: s.plats.map((p) => (p.key === platKey ? { ...p, pax } : p)),
    }));
  }

  distribute(sectionKey: number): void {
    const couverts = this.couverts() ?? 0;
    this.updateSection(sectionKey, (s) => {
      const split = splitEvenly(couverts, s.plats.length);
      return { ...s, plats: s.plats.map((p, i) => ({ ...p, pax: split[i] })) };
    });
  }

  renameSection(sectionKey: number, name: string): void {
    this.updateSection(sectionKey, (s) => ({ ...s, name }));
  }

  addSection(): void {
    this.sections.update((sections) => [...sections, { key: nextKey++, name: '', plats: [] }]);
  }

  removeSection(sectionKey: number): void {
    this.sections.update((sections) => sections.filter((s) => s.key !== sectionKey));
  }

  moveSection(index: number, direction: -1 | 1): void {
    this.sections.update((sections) => {
      const target = index + direction;
      if (target < 0 || target >= sections.length) return sections;
      const next = [...sections];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  setPendingFiche(sectionKey: number, ficheId: number | null): void {
    this.pendingFiche.update((pending) => ({ ...pending, [sectionKey]: ficheId }));
  }

  /** Ajoute la fiche choisie comme nouveau plat de la section, avec les couverts restants à répartir. */
  addFiche(section: SectionRow): void {
    const fiche = this.fichesById().get(this.pendingFiche()[section.key] ?? -1);
    if (!fiche) return;

    const remaining = Math.max(0, (this.couverts() ?? 0) - this.totalPax(section));
    this.updateSection(section.key, (s) => ({
      ...s,
      plats: [...s.plats, { key: nextKey++, name: fiche.name, pax: remaining, ficheIds: [fiche.id] }],
    }));
    this.setPendingFiche(section.key, null);
  }

  removePlat(sectionKey: number, platKey: number): void {
    this.updateSection(sectionKey, (s) => ({ ...s, plats: s.plats.filter((p) => p.key !== platKey) }));
  }

  movePlat(sectionKey: number, index: number, direction: -1 | 1): void {
    this.updateSection(sectionKey, (s) => {
      const target = index + direction;
      if (target < 0 || target >= s.plats.length) return s;
      const plats = [...s.plats];
      [plats[index], plats[target]] = [plats[target], plats[index]];
      return { ...s, plats };
    });
  }

  // --- Enregistrement --------------------------------------------------------------------------

  save(): void {
    const request = this.persist();
    if (!request) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    request.subscribe({
      next: () => this.router.navigate(['/calendrier']),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }

  /** Enregistre l'événement (plats compris) puis génère ses tâches de mise en place — on reste
   * sur la page pour voir le résultat. */
  saveAndGenerateMiseEnPlace(): void {
    const request = this.persist();
    if (!request) return;

    this.generating.set(true);
    this.generationResult.set(null);
    this.errorMessage.set(null);
    request
      .pipe(
        switchMap((event) => {
          // Un nouvel événement devient un événement existant : la suite de l'édition le met à
          // jour au lieu d'en créer un second, et l'URL suit (sans recharger la page).
          this.editingEvent.set(event);
          this.location.replaceState(`/calendrier/${event.id}`);
          const deadline = this.effectiveDeadline();
          return this.eventService.generateMiseEnPlace(event.id, {
            deadline: deadline ? deadline.replace('T', ' ') : null,
            urgency: this.mepUrgency(),
          });
        }),
      )
      .subscribe({
        next: (result) => {
          this.generating.set(false);
          this.generationResult.set(result);
        },
        error: () => {
          this.generating.set(false);
          this.errorMessage.set('Impossible de créer les tâches de mise en place.');
        },
      });
  }

  /** Requête d'enregistrement (création ou mise à jour), ou null si le formulaire est incomplet. */
  private persist(): Observable<CalendarEvent> | null {
    const name = this.name().trim();
    const startDate = this.startDate();
    if (!name || !startDate) {
      this.errorMessage.set('Le nom et la date de début sont requis.');
      return null;
    }

    const payload: CalendarEventPayload = {
      name,
      detail: this.detail().trim() || null,
      horaire: this.horaire().trim() || null,
      couverts: this.couverts(),
      type: this.type(),
      start_date: startDate,
      end_date: this.endDate() || startDate,
      menu_id: this.mode() === 'menu' ? this.menuId() : null,
      allergen_ids: this.allergenIds(),
      allergies_note: this.allergiesNote().trim() || null,
      // Une section sans plat n'a rien à enregistrer — elle disparaît au rechargement.
      plats: this.sections().flatMap((section) =>
        section.plats.map((plat) => ({
          section: section.name.trim() || 'Autre',
          name: plat.name,
          pax: plat.pax,
          fiche_technique_ids: plat.ficheIds,
        })),
      ),
    };

    const editing = this.editingEvent();
    return editing ? this.eventService.update(editing.id, payload) : this.eventService.create(payload);
  }

  deleteConfirmed(): void {
    const event = this.editingEvent();
    if (!event) return;
    this.eventService.delete(event.id).subscribe(() => this.router.navigate(['/calendrier']));
  }

  printLabel(): void {
    const event = this.editingEvent();
    if (!event) return;

    this.printingLabel.set(true);
    this.printLabelError.set(null);
    this.eventService.printLabel(event.id).subscribe({
      next: () => this.printingLabel.set(false),
      error: () => {
        this.printingLabel.set(false);
        this.printLabelError.set("Impossible d'imprimer l'étiquette.");
      },
    });
  }

  /** N'imprime que la répartition et la liste de marchandise (le formulaire est `no-print`). */
  printSheet(): void {
    this.setReportTitle(`Événement — ${this.name().trim() || 'sans nom'} — ${this.startDate()}`);
    window.print();
  }

  formatQuantity = formatQuantity;
}
