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
}
