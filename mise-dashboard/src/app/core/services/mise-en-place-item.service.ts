import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { MiseEnPlaceItem, MiseEnPlaceStatus, MiseEnPlaceUrgency } from '../models/mise-en-place-item.model';

@Injectable({ providedIn: 'root' })
export class MiseEnPlaceItemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/mise-en-place-items`;

  list() {
    return this.http.get<MiseEnPlaceItem[]>(this.baseUrl);
  }

  create(name: string, stationId: number, deadline: string, urgency: MiseEnPlaceUrgency) {
    return this.http.post<MiseEnPlaceItem>(this.baseUrl, {
      name,
      station_id: stationId,
      deadline,
      urgency,
    });
  }

  updateStatus(id: number, status: MiseEnPlaceStatus) {
    return this.http.patch<MiseEnPlaceItem>(`${this.baseUrl}/${id}`, { status });
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
