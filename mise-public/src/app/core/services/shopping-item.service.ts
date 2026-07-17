import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { ShoppingItem } from '../models/shopping-item.model';

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
}
