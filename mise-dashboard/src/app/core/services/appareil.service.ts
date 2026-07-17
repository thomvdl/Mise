import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Appareil, AppareilPayload } from '../models/appareil.model';

@Injectable({ providedIn: 'root' })
export class AppareilService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/appareils`;

  list() {
    return this.http.get<Appareil[]>(this.baseUrl);
  }

  get(id: number) {
    return this.http.get<Appareil>(`${this.baseUrl}/${id}`);
  }

  create(payload: AppareilPayload) {
    return this.http.post<Appareil>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<AppareilPayload>) {
    return this.http.patch<Appareil>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
