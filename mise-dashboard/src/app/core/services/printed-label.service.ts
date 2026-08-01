import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { PrintedLabel } from '../models/printed-label.model';

export interface PrintedLabelFilters {
  typeKey?: string;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class PrintedLabelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/printed-labels`;

  list(filters: PrintedLabelFilters = {}) {
    let params = new HttpParams();
    if (filters.typeKey) params = params.set('type_key', filters.typeKey);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);

    return this.http.get<PrintedLabel[]>(this.baseUrl, { params });
  }
}
