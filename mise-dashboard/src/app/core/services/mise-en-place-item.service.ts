import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { MiseEnPlaceItem, MiseEnPlaceStatus, MiseEnPlaceUrgency } from '../models/mise-en-place-item.model';

/** Une tâche se rattache à une station, un groupe ou un événement — un seul des trois (imposé
 * côté API), d'où le type discriminé plutôt que trois paramètres optionnels indépendants. */
export type MiseEnPlaceClassification =
  | { kind: 'station'; id: number }
  | { kind: 'group'; id: number }
  | { kind: 'event'; id: number };

@Injectable({ providedIn: 'root' })
export class MiseEnPlaceItemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/mise-en-place-items`;

  list() {
    return this.http.get<MiseEnPlaceItem[]>(this.baseUrl);
  }

  create(
    name: string,
    classification: MiseEnPlaceClassification,
    deadline: string | null,
    urgency: MiseEnPlaceUrgency,
  ) {
    return this.http.post<MiseEnPlaceItem>(this.baseUrl, {
      name,
      station_id: classification.kind === 'station' ? classification.id : null,
      group_id: classification.kind === 'group' ? classification.id : null,
      event_id: classification.kind === 'event' ? classification.id : null,
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
