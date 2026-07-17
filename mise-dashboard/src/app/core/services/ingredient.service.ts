import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Ingredient, IngredientPayload } from '../models/ingredient.model';

@Injectable({ providedIn: 'root' })
export class IngredientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ingredients`;

  list() {
    return this.http.get<Ingredient[]>(this.baseUrl);
  }

  get(id: number) {
    return this.http.get<Ingredient>(`${this.baseUrl}/${id}`);
  }

  create(payload: IngredientPayload) {
    return this.http.post<Ingredient>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<IngredientPayload>) {
    return this.http.patch<Ingredient>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
