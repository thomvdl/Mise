import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { TemperatureRelevePayload } from '../models/temperature-releve.model';

@Injectable({ providedIn: 'root' })
export class TemperatureReleveService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/temperature-releves`;

  create(payload: TemperatureRelevePayload) {
    return this.http.post(this.baseUrl, payload);
  }
}
