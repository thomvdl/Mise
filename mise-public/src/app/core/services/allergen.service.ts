import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Allergen } from '../models/allergen.model';

@Injectable({ providedIn: 'root' })
export class AllergenService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<Allergen[]>(`${environment.apiUrl}/allergens`);
  }
}
