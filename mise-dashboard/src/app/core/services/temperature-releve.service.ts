import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { TemperatureReleve, TemperatureRelevePayload } from '../models/temperature-releve.model';

export interface TemperatureReleveFilters {
  appareilId?: number;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class TemperatureReleveService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/temperature-releves`;

  list(filters: TemperatureReleveFilters = {}) {
    let params = new HttpParams();
    if (filters.appareilId) params = params.set('appareil_id', filters.appareilId);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);

    return this.http.get<TemperatureReleve[]>(this.baseUrl, { params });
  }

  create(payload: TemperatureRelevePayload) {
    return this.http.post<TemperatureReleve>(this.baseUrl, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
