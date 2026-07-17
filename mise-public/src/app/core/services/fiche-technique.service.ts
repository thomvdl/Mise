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
}
