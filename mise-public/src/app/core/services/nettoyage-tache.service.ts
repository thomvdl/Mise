import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { NettoyageTache } from '../models/nettoyage-tache.model';

@Injectable({ providedIn: 'root' })
export class NettoyageTacheService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/nettoyage-taches`;

  list() {
    return this.http.get<NettoyageTache[]>(this.baseUrl);
  }

  get(id: number) {
    return this.http.get<NettoyageTache>(`${this.baseUrl}/${id}`);
  }
}
