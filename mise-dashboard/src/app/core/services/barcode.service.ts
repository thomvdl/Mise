import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

export interface BarcodeLookupResult {
  name: string;
}

/** Résolution d'un code-barres EAN vers un nom de produit (proxy Open Food Facts côté
 *  API — voir BarcodeController) pour préremplir le champ "Produit" des étiquettes. */
@Injectable({ providedIn: 'root' })
export class BarcodeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/barcode`;

  lookup(ean: string) {
    return this.http.get<BarcodeLookupResult>(`${this.baseUrl}/${ean}`);
  }
}
