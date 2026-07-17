import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { SimpleEntityConfig } from '../../core/config/simple-entity.config';
import { SimpleEntity } from '../../core/models/simple-entity.model';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-simple-entity-list',
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './simple-entity-list.html',
  styleUrl: './simple-entity-list.css',
})
export class SimpleEntityList implements OnInit {
  private readonly http = inject(HttpClient);
  private service!: SimpleEntityService;

  config = input.required<SimpleEntityConfig>();

  items = signal<SimpleEntity[]>([]);
  search = signal('');
  pendingDelete = signal<SimpleEntity | null>(null);

  filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.items();
    return this.items().filter((item) => item.name.toLowerCase().includes(query));
  });

  columnCount = computed(() => 3 + (this.hasField('code') ? 1 : 0) + (this.hasField('color') ? 1 : 0));

  deleteMessage = computed(() => {
    const item = this.pendingDelete();
    return item ? `Supprimer ${this.config().singularLabel} « ${item.name} » ? Cette action est irréversible.` : '';
  });

  ngOnInit(): void {
    this.service = new SimpleEntityService(this.http, this.config().resource);
    this.reload();
  }

  hasField(key: string): boolean {
    return this.config().fields.some((field) => field.key === key);
  }

  reload(): void {
    this.service.list().subscribe((items) => this.items.set(items));
  }

  confirmDelete(item: SimpleEntity): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.service.delete(item.id).subscribe(() => {
      this.items.update((items) => items.filter((i) => i.id !== item.id));
      this.pendingDelete.set(null);
    });
  }
}
