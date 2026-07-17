import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Menu, MenuPayload } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/menus`;

  list() {
    return this.http.get<Menu[]>(this.baseUrl);
  }

  get(id: number) {
    return this.http.get<Menu>(`${this.baseUrl}/${id}`);
  }

  create(payload: MenuPayload) {
    return this.http.post<Menu>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<MenuPayload>) {
    return this.http.patch<Menu>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
