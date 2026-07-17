import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Appareil } from '../../core/models/appareil.model';
import { AppareilService } from '../../core/services/appareil.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-appareil-list',
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './appareil-list.html',
  styleUrl: './appareil-list.css',
})
export class AppareilList implements OnInit {
  private readonly appareilService = inject(AppareilService);

  items = signal<Appareil[]>([]);
  search = signal('');
  pendingDelete = signal<Appareil | null>(null);

  filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.items();
    return this.items().filter(
      (item) => item.name.toLowerCase().includes(query) || item.fonction.toLowerCase().includes(query),
    );
  });

  deleteMessage = computed(() => {
    const item = this.pendingDelete();
    return item ? `Supprimer l'appareil « ${item.name} » ? Les relevés de température associés seront également supprimés.` : '';
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.appareilService.list().subscribe((items) => this.items.set(items));
  }

  confirmDelete(item: Appareil): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.appareilService.delete(item.id).subscribe(() => {
      this.items.update((items) => items.filter((i) => i.id !== item.id));
      this.pendingDelete.set(null);
    });
  }
}
