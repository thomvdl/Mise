import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Note, NotePayload } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notes`;

  /** Pages racines, sous-pages incluses (une seule profondeur) — tout l'arbre en un appel. */
  list() {
    return this.http.get<Note[]>(this.baseUrl);
  }

  get(id: number) {
    return this.http.get<Note>(`${this.baseUrl}/${id}`);
  }

  create(payload: NotePayload) {
    return this.http.post<Note>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<NotePayload>) {
    return this.http.put<Note>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
