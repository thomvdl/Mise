import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Channel, ChannelPayload } from '../models/channel.model';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/channels`;

  list() {
    return this.http.get<Channel[]>(this.baseUrl);
  }

  create(payload: ChannelPayload) {
    return this.http.post<Channel>(this.baseUrl, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
