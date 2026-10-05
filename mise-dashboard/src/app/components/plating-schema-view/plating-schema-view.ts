import { Component, computed, input } from '@angular/core';

import { PlateShape, PlatingSchema, PlatingSchemaElement } from '../../core/models/fiche-technique.model';

/**
 * Rendu statique (non interactif) d'un schéma de dressage — même géométrie que
 * `PlatingSchemaEditor`, sans drag ni panneau d'édition, pour l'aperçu d'impression.
 */
@Component({
  selector: 'app-plating-schema-view',
  imports: [],
  templateUrl: './plating-schema-view.html',
  styleUrl: './plating-schema-view.css',
})
export class PlatingSchemaView {
  schema = input<PlatingSchema | null>(null);

  plateShape = computed<PlateShape>(() => this.schema()?.plate ?? 'round');
  elements = computed<PlatingSchemaElement[]>(() => this.schema()?.elements ?? []);
  legend = computed<PlatingSchemaElement[]>(() => this.elements().filter((e) => e.label));
}
