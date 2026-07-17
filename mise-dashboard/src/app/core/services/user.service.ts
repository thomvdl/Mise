import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { ManagedUser, ManagedUserPayload } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  list() {
    return this.http.get<ManagedUser[]>(this.baseUrl);
  }

  create(payload: ManagedUserPayload) {
    return this.http.post<ManagedUser>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<ManagedUserPayload>) {
    return this.http.patch<ManagedUser>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
