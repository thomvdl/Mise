import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Appareil } from '../models/appareil.model';

@Injectable({ providedIn: 'root' })
export class AppareilService {
  private readonly http = inject(HttpClient);
  private list$?: Observable<Appareil[]>;

  /** Cached since the list of fridges/friteuses rarely changes — refreshed on full page reload. */
  list(): Observable<Appareil[]> {
    if (!this.list$) {
      this.list$ = this.http.get<Appareil[]>(`${environment.apiUrl}/appareils`).pipe(shareReplay(1));
    }

    return this.list$;
  }
}
