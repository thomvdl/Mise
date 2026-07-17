import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Ingredient } from '../models/ingredient.model';

@Injectable({ providedIn: 'root' })
export class IngredientService {
  private readonly http = inject(HttpClient);
  private list$?: Observable<Ingredient[]>;

  /** Only endpoint that eager-loads `allergens` per ingredient — cached since it rarely changes. */
  list(): Observable<Ingredient[]> {
    if (!this.list$) {
      this.list$ = this.http
        .get<Ingredient[]>(`${environment.apiUrl}/ingredients`)
        .pipe(shareReplay(1));
    }

    return this.list$;
  }
}
