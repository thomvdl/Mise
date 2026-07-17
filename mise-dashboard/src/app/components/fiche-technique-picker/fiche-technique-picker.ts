import { Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';

import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { slugify } from '../../core/utils/slugify';

/**
 * Searchable multi-select dropdown for linking fiche techniques to a plat. A plain checkbox
 * grid becomes unwieldy once the catalog grows, so selections show as removable chips and the
 * full list only appears (filtered by a search field) while the dropdown is open.
 */
@Component({
  selector: 'app-fiche-technique-picker',
  imports: [],
  templateUrl: './fiche-technique-picker.html',
  styleUrl: './fiche-technique-picker.css',
})
export class FicheTechniquePicker {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  items = input<FicheTechnique[]>([]);
  selectedIds = input<number[]>([]);
  toggle = output<number>();

  open = signal(false);
  search = signal('');

  selected = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.items().filter((item) => ids.has(item.id));
  });

  filtered = computed(() => {
    const query = slugify(this.search().trim());
    if (!query) return this.items();
    return this.items().filter((item) => slugify(item.name).includes(query));
  });

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  toggleOpen(): void {
    this.open.update((value) => !value);
    if (this.open()) this.search.set('');
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  select(id: number): void {
    this.toggle.emit(id);
  }

  remove(id: number, event: Event): void {
    event.stopPropagation();
    this.toggle.emit(id);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
