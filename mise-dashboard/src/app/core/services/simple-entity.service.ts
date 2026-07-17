import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { SimpleEntity } from '../models/simple-entity.model';

/**
 * Not `providedIn: 'root'` — instantiated per resource with `new SimpleEntityService(http, resource)`,
 * since the same CRUD shape (name/slug/color[/code]) serves 4 distinct API resources.
 */
export class SimpleEntityService<T extends SimpleEntity = SimpleEntity> {
  constructor(
    private readonly http: HttpClient,
    private readonly resource: string,
  ) {}

  private get baseUrl(): string {
    return `${environment.apiUrl}/${this.resource}`;
  }

  list() {
    return this.http.get<T[]>(this.baseUrl);
  }

  get(id: number) {
    return this.http.get<T>(`${this.baseUrl}/${id}`);
  }

  create(payload: Partial<T>) {
    return this.http.post<T>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<T>) {
    return this.http.patch<T>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
