import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { CalendarEvent, CalendarEventPayload, MiseEnPlaceGenerationResult } from '../models/calendar-event.model';
import { LocalPrinterService } from './local-printer.service';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly localPrinter = inject(LocalPrinterService);
  private readonly baseUrl = `${environment.apiUrl}/events`;

  list(month: number, year: number) {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<CalendarEvent[]>(this.baseUrl, { params });
  }

  /** Sans filtre mois/année, l'API renvoie tous les événements — utilisé par le sélecteur
   * d'événement de la mise en place, qui n'est pas cantonné à un mois précis. */
  listAll() {
    return this.http.get<CalendarEvent[]>(this.baseUrl);
  }

  get(id: number) {
    return this.http.get<CalendarEvent>(`${this.baseUrl}/${id}`);
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

  /** Crée ou met à jour les tâches de mise en place de l'événement depuis ses plats enregistrés. */
  generateMiseEnPlace(id: number, payload: { deadline: string | null; urgency: string }) {
    return this.http.post<MiseEnPlaceGenerationResult>(`${this.baseUrl}/${id}/mise-en-place`, payload);
  }

  printLabel(id: number) {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${id}/print-label`, {
      printer_id: this.localPrinter.printerId(),
    });
  }
}
