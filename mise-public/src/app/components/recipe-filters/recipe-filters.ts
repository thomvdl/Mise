import { Component, input, model } from '@angular/core';

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

  selectStation(slug: string | null) {
    this.activeStationSlug.set(slug);
  }
}
