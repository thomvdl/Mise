import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { ShoppingItem, ShoppingStatus } from '../models/shopping-item.model';

@Injectable({ providedIn: 'root' })
export class ShoppingItemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/shopping-items`;

  list() {
    return this.http.get<ShoppingItem[]>(this.baseUrl);
  }

  create(name: string) {
    return this.http.post<ShoppingItem>(this.baseUrl, { name });
  }

  updateStatus(id: number, status: ShoppingStatus) {
    return this.http.patch<ShoppingItem>(`${this.baseUrl}/${id}`, { status });
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
