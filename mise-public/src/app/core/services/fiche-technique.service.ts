import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { FicheTechnique } from '../models/fiche-technique.model';

@Injectable({ providedIn: 'root' })
export class FicheTechniqueService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<FicheTechnique[]>(`${environment.apiUrl}/fiche-techniques`);
  }

  get(id: number) {
    return this.http.get<FicheTechnique>(`${environment.apiUrl}/fiche-techniques/${id}`);
  }

  /** Imprime la fiche sur le ticket thermique (ESC/POS/TCP côté serveur) — voir
   * FicheTechniqueController::printThermal. `servings` permet de tirer le ticket à l'échelle
   * d'un nombre de portions différent de celui de la fiche (même dial +/- que la page "Voir"). */
  printThermal(id: number, payload: { printer_id: number | null; servings: number }) {
    return this.http.post<void>(`${environment.apiUrl}/fiche-techniques/${id}/print-thermal`, payload);
  }
}
