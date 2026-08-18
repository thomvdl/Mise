import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Category } from '../../core/models/category.model';
import { Station } from '../../core/models/station.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { ficheTechniqueToMarkdown, fichesTechniquesToMarkdown } from '../../core/utils/fiche-technique-markdown';
import { downloadTextFile } from '../../core/utils/download';

@Component({
  selector: 'app-fiche-technique-list',
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './fiche-technique-list.html',
  styleUrl: './fiche-technique-list.css',
})
export class FicheTechniqueList implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly categoryService = new SimpleEntityService<Category>(this.http, 'categories');
  private readonly stationService = new SimpleEntityService<Station>(this.http, 'stations');

  items = signal<FicheTechnique[]>([]);
  categories = signal<Category[]>([]);
  stations = signal<Station[]>([]);
  search = signal('');
  selectedCategoryId = signal<number | null>(null);
  selectedStationId = signal<number | null>(null);
  pendingDelete = signal<FicheTechnique | null>(null);
  selected = signal<Set<number>>(new Set());

  filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const categoryId = this.selectedCategoryId();
    const stationId = this.selectedStationId();

    return this.items().filter((item) => {
      const matchesQuery = !query || item.name.toLowerCase().includes(query);
      const matchesCategory = categoryId === null || item.category?.id === categoryId;
      const matchesStation = stationId === null || item.station?.id === stationId;
      return matchesQuery && matchesCategory && matchesStation;
    });
  });

  /** Coché seulement si toutes les lignes actuellement visibles (filtrées par la recherche) le sont. */
  allSelected = computed(() => {
    const visible = this.filtered();
    return visible.length > 0 && visible.every((item) => this.selected().has(item.id));
  });

  deleteMessage = computed(() => {
    const item = this.pendingDelete();
    return item ? `Supprimer la fiche technique « ${item.name} » ? Cette action est irréversible.` : '';
  });

  ngOnInit(): void {
    this.reload();
    this.categoryService.list().subscribe((items) => this.categories.set(items));
    this.stationService.list().subscribe((items) => this.stations.set(items));
  }

  reload(): void {
    this.ficheTechniqueService.list().subscribe((items) => this.items.set(items));
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(value ? Number(value) : null);
  }

  onStationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStationId.set(value ? Number(value) : null);
  }

  confirmDelete(item: FicheTechnique): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.ficheTechniqueService.delete(item.id).subscribe(() => {
      this.items.update((items) => items.filter((i) => i.id !== item.id));
      this.selected.update((set) => {
        if (!set.has(item.id)) return set;
        const next = new Set(set);
        next.delete(item.id);
        return next;
      });
      this.pendingDelete.set(null);
    });
  }

  exportOne(item: FicheTechnique): void {
    downloadTextFile(`${item.slug}.md`, ficheTechniqueToMarkdown(item));
  }

  isSelected(id: number): boolean {
    return this.selected().has(id);
  }

  toggleSelected(id: number): void {
    this.selected.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    const visibleIds = this.filtered().map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => this.selected().has(id));

    this.selected.update((set) => {
      const next = new Set(set);
      visibleIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  exportSelection(): void {
    const selectedItems = this.items().filter((item) => this.selected().has(item.id));
    if (selectedItems.length === 0) return;
    downloadTextFile('fiches-techniques.md', fichesTechniquesToMarkdown(selectedItems));
  }
}
