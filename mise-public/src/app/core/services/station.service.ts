import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Station } from '../models/station.model';

@Injectable({ providedIn: 'root' })
export class StationService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<Station[]>(`${environment.apiUrl}/stations`);
  }
}
