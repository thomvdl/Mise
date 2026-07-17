import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ShoppingItemService } from '../../core/services/shopping-item.service';
import { ShoppingItem } from '../../core/models/shopping-item.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-shopping-list',
  imports: [FormsModule, DatePipe, ConfirmDialog],
  templateUrl: './shopping-list.html',
  styleUrl: './shopping-list.css',
})
export class ShoppingList implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly shoppingItemService = inject(ShoppingItemService);

  readonly isAdmin = this.auth.isAdmin();

  items = signal<ShoppingItem[]>([]);
  newItemName = signal('');
  pendingDelete = signal<ShoppingItem | null>(null);
  pendingClearAll = signal(false);

  sortByStatus = signal(false);

  sortedItems = computed(() => {
    const items = this.items();
    if (!this.sortByStatus()) return items;
    return [...items].sort((a, b) => (a.status === b.status ? 0 : a.status === 'done' ? 1 : -1));
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.shoppingItemService.list().subscribe((items) => this.items.set([...items].reverse()));
  }

  toggleSort(): void {
    this.sortByStatus.update((sorted) => !sorted);
  }

  addItem(): void {
    const name = this.newItemName().trim();
    if (!name) return;

    this.shoppingItemService.create(name).subscribe(() => {
      this.newItemName.set('');
      this.reload();
    });
  }

  toggleStatus(item: ShoppingItem): void {
    const nextStatus = item.status === 'todo' ? 'done' : 'todo';
    this.shoppingItemService.updateStatus(item.id, nextStatus).subscribe(() => this.reload());
  }

  confirmDelete(item: ShoppingItem): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.shoppingItemService.delete(item.id).subscribe(() => {
      this.pendingDelete.set(null);
      this.reload();
    });
  }

  confirmClearAll(): void {
    this.pendingClearAll.set(true);
  }

  cancelClearAll(): void {
    this.pendingClearAll.set(false);
  }

  clearAllConfirmed(): void {
    const ids = this.items().map((item) => item.id);
    if (ids.length === 0) {
      this.pendingClearAll.set(false);
      return;
    }

    forkJoin(ids.map((id) => this.shoppingItemService.delete(id))).subscribe(() => {
      this.pendingClearAll.set(false);
      this.reload();
    });
  }
}
