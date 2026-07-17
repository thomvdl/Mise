import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { FicheTechnique, FicheTechniquePayload } from '../models/fiche-technique.model';

@Injectable({ providedIn: 'root' })
export class FicheTechniqueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/fiche-techniques`;

  list() {
    return this.http.get<FicheTechnique[]>(this.baseUrl);
  }

  get(id: number) {
    return this.http.get<FicheTechnique>(`${this.baseUrl}/${id}`);
  }

  create(payload: FicheTechniquePayload) {
    return this.http.post<FicheTechnique>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<FicheTechniquePayload>) {
    return this.http.patch<FicheTechnique>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
