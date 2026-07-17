import { Component, input, model, output } from '@angular/core';

import { Station } from '../../core/models/station.model';

@Component({
  selector: 'app-recipe-filters',
  imports: [],
  templateUrl: './recipe-filters.html',
  styleUrl: './recipe-filters.css',
})
export class RecipeFilters {
  stations = input<Station[]>([]);
  activeStationSlug = model<string | null>(null);
  searchChange = output<string>();

  selectStation(slug: string | null) {
    this.activeStationSlug.set(slug);
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }
}
