import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LabelTypeRecord, labelTypeFromRecord } from '../models/label.model';

export interface LabelTypePayload {
  key: string;
  name: string;
  jplus_days: number | null;
  icon_key: string | null;
  position?: number;
}

@Injectable({ providedIn: 'root' })
export class LabelTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/label-types`;

  list() {
    return this.http.get<LabelTypeRecord[]>(this.baseUrl).pipe(map((records) => records.map(labelTypeFromRecord)));
  }

  /** Enregistrements bruts (avec `id`) pour la page d'admin — `list()` ci-dessus renvoie la forme
   *  simplifiée `LabelType` utilisée par les pages Étiquettes, pas assez pour éditer/supprimer. */
  listRecords() {
    return this.http.get<LabelTypeRecord[]>(this.baseUrl);
  }

  create(payload: LabelTypePayload) {
    return this.http.post<LabelTypeRecord>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<LabelTypePayload>) {
    return this.http.patch<LabelTypeRecord>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
