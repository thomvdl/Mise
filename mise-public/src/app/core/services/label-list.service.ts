import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { LabelList, LabelListPayload } from '../models/label-list.model';

@Injectable({ providedIn: 'root' })
export class LabelListService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/label-lists`;

  list() {
    return this.http.get<LabelList[]>(this.baseUrl);
  }

  create(payload: LabelListPayload) {
    return this.http.post<LabelList>(this.baseUrl, payload);
  }

  update(id: number, payload: LabelListPayload) {
    return this.http.put<LabelList>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
