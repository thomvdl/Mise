import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { ChangementHuile, ChangementHuilePayload } from '../models/changement-huile.model';

export interface ChangementHuileFilters {
  friteuseId?: number;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class ChangementHuileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/changements-huile`;

  list(filters: ChangementHuileFilters = {}) {
    let params = new HttpParams();
    if (filters.friteuseId) params = params.set('friteuse_id', filters.friteuseId);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);

    return this.http.get<ChangementHuile[]>(this.baseUrl, { params });
  }

  create(payload: ChangementHuilePayload) {
    return this.http.post<ChangementHuile>(this.baseUrl, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
