import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { PrintedLabelPayload, ZebraPrintPayload } from '../models/printed-label.model';

@Injectable({ providedIn: 'root' })
export class PrintedLabelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/printed-labels`;

  create(payload: PrintedLabelPayload) {
    return this.http.post(this.baseUrl, payload);
  }

  /** Imprime réellement sur la Zebra réseau (le serveur ouvre le socket) puis journalise — voir PrintedLabelController::printZebra. */
  printZebra(payload: ZebraPrintPayload) {
    return this.http.post(`${this.baseUrl}/print-zebra`, payload);
  }
}
