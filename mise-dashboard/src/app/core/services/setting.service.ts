import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

export interface Setting {
  key: string;
  value: string | null;
}

@Injectable({ providedIn: 'root' })
export class SettingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/settings`;

  list() {
    return this.http.get<Setting[]>(this.baseUrl);
  }

  update(key: string, value: string | null) {
    return this.http.put<Setting>(`${this.baseUrl}/${key}`, { value });
  }
}
