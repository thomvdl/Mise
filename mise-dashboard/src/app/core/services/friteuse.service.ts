import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Friteuse, FriteusePayload } from '../models/friteuse.model';

@Injectable({ providedIn: 'root' })
export class FriteuseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/friteuses`;

  list() {
    return this.http.get<Friteuse[]>(this.baseUrl);
  }

  get(id: number) {
    return this.http.get<Friteuse>(`${this.baseUrl}/${id}`);
  }

  create(payload: FriteusePayload) {
    return this.http.post<Friteuse>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<FriteusePayload>) {
    return this.http.patch<Friteuse>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
