import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LabelTypeRecord, labelTypeFromRecord } from '../models/label.model';

@Injectable({ providedIn: 'root' })
export class LabelTypeService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http
      .get<LabelTypeRecord[]>(`${environment.apiUrl}/label-types`)
      .pipe(map((records) => records.map(labelTypeFromRecord)));
  }
}
