import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Printer, PrinterPayload } from '../models/printer.model';

@Injectable({ providedIn: 'root' })
export class PrinterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/printers`;

  list() {
    return this.http.get<Printer[]>(this.baseUrl);
  }

  create(payload: PrinterPayload) {
    return this.http.post<Printer>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<PrinterPayload>) {
    return this.http.patch<Printer>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
