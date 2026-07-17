import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Message, MessagePayload } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/messages`;

  list(channelId: number) {
    const params = new HttpParams().set('channel_id', channelId);
    return this.http.get<Message[]>(this.baseUrl, { params });
  }

  create(payload: MessagePayload) {
    return this.http.post<Message>(this.baseUrl, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
