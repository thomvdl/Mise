import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { NettoyageRealisation } from '../models/nettoyage-tache.model';

/** Lecture seule : le registre est append-only et on le remplit depuis la cuisine (mise-public). */
@Injectable({ providedIn: 'root' })
export class NettoyageRealisationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/nettoyage-realisations`;

  list(filters: { from?: string; to?: string; zone?: string }) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<NettoyageRealisation[]>(this.baseUrl, { params });
  }
}
