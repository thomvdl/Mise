import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Printer } from '../models/printer.model';

/** Lecture seule côté public — gérées depuis le dashboard (voir PrinterController côté API). */
@Injectable({ providedIn: 'root' })
export class PrinterService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<Printer[]>(`${environment.apiUrl}/printers`);
  }
}
