import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Message, MessagePayload } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);

  list(channelId: number) {
    const params = new HttpParams().set('channel_id', channelId);
    return this.http.get<Message[]>(`${environment.apiUrl}/messages`, { params });
  }

  create(payload: MessagePayload) {
    return this.http.post<Message>(`${environment.apiUrl}/messages`, payload);
  }
}
