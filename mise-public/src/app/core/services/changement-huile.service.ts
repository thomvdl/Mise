import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { ChangementHuilePayload } from '../models/changement-huile.model';

@Injectable({ providedIn: 'root' })
export class ChangementHuileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/changements-huile`;

  create(payload: ChangementHuilePayload) {
    return this.http.post(this.baseUrl, payload);
  }
}
