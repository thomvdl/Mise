import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Channel } from '../models/channel.model';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<Channel[]>(`${environment.apiUrl}/channels`);
  }
}
