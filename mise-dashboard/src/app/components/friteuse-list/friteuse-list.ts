import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Friteuse } from '../../core/models/friteuse.model';
import { FriteuseService } from '../../core/services/friteuse.service';
import { isChangeOverdue, lastChangeDate, nextChangeDate } from '../../core/utils/friteuse-schedule';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-friteuse-list',
  imports: [RouterLink, ConfirmDialog, DatePipe],
  templateUrl: './friteuse-list.html',
  styleUrl: './friteuse-list.css',
})
export class FriteuseList implements OnInit {
  private readonly friteuseService = inject(FriteuseService);

  items = signal<Friteuse[]>([]);
  search = signal('');
  pendingDelete = signal<Friteuse | null>(null);

  filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.items();
    return this.items().filter((item) => item.name.toLowerCase().includes(query));
  });

  deleteMessage = computed(() => {
    const item = this.pendingDelete();
    return item ? `Supprimer la friteuse « ${item.name} » ? Son historique de changements sera également supprimé.` : '';
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.friteuseService.list().subscribe((items) => this.items.set(items));
  }

  lastChange(item: Friteuse): string | null {
    return lastChangeDate(item);
  }

  nextChange(item: Friteuse): Date | null {
    return nextChangeDate(item);
  }

  overdue(item: Friteuse): boolean {
    return isChangeOverdue(item);
  }

  confirmDelete(item: Friteuse): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.friteuseService.delete(item.id).subscribe(() => {
      this.items.update((items) => items.filter((i) => i.id !== item.id));
      this.pendingDelete.set(null);
    });
  }
}
