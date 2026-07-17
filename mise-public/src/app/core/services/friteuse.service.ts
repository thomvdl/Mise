import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Friteuse } from '../models/friteuse.model';

@Injectable({ providedIn: 'root' })
export class FriteuseService {
  private readonly http = inject(HttpClient);

  /** Includes each friteuse's full change history — no separate call needed to show it. */
  list() {
    return this.http.get<Friteuse[]>(`${environment.apiUrl}/friteuses`);
  }
}
