import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Picture } from '../models/picture.model';

@Injectable({ providedIn: 'root' })
export class PictureService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pictures`;

  list() {
    return this.http.get<Picture[]>(this.baseUrl);
  }

  upload(files: File[]) {
    const formData = new FormData();
    for (const file of files) formData.append('files[]', file);
    return this.http.post<Picture[]>(this.baseUrl, formData);
  }

  link(id: number, ficheTechniqueId: number | null) {
    return this.http.patch<Picture>(`${this.baseUrl}/${id}`, { fiche_technique_id: ficheTechniqueId });
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
