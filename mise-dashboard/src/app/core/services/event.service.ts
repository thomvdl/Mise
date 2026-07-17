import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { CalendarEvent, CalendarEventPayload } from '../models/calendar-event.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/events`;

  list(month: number, year: number) {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<CalendarEvent[]>(this.baseUrl, { params });
  }

  create(payload: CalendarEventPayload) {
    return this.http.post<CalendarEvent>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<CalendarEventPayload>) {
    return this.http.patch<CalendarEvent>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
