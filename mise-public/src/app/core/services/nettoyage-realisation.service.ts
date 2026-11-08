import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { NettoyageRealisation } from '../models/nettoyage-tache.model';

@Injectable({ providedIn: 'root' })
export class NettoyageRealisationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/nettoyage-realisations`;

  /** Historique court d'une tâche, du plus récent au plus ancien. */
  history(tacheId: number, limit = 10) {
    const params = new HttpParams().set('nettoyage_tache_id', tacheId).set('limit', limit);
    return this.http.get<NettoyageRealisation[]>(this.baseUrl, { params });
  }

  /** Marque la tâche faite maintenant, par l'utilisateur connecté (fixés côté serveur). */
  create(tacheId: number) {
    return this.http.post<NettoyageRealisation>(this.baseUrl, { nettoyage_tache_id: tacheId });
  }
}
