import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { CalendarEvent } from '../models/calendar-event.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);

  list(month: number, year: number) {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<CalendarEvent[]>(`${environment.apiUrl}/events`, { params });
  }

  /** Sans filtre mois/année, l'API renvoie tous les événements — utilisé par le sélecteur
   * d'événement de la mise en place, qui n'est pas cantonné à un mois précis. */
  listAll() {
    return this.http.get<CalendarEvent[]>(`${environment.apiUrl}/events`);
  }

  printLabel(id: number) {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/events/${id}/print-label`, {});
  }
}
