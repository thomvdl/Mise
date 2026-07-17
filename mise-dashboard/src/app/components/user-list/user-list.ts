import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ManagedUser } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-user-list',
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserList implements OnInit {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);

  items = signal<ManagedUser[]>([]);
  pendingDelete = signal<ManagedUser | null>(null);
  errorMessage = signal<string | null>(null);

  /** The signed-in admin can't remove their own account from here (avoids self-lockout mid-session). */
  currentUserId = computed(() => this.auth.user()?.id ?? null);

  deleteMessage = computed(() => {
    const item = this.pendingDelete();
    return item ? `Supprimer l'utilisateur « ${item.name} » ?` : '';
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.userService.list().subscribe((items) => this.items.set(items));
  }

  confirmDelete(item: ManagedUser): void {
    this.errorMessage.set(null);
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.userService.delete(item.id).subscribe({
      next: () => {
        this.items.update((items) => items.filter((i) => i.id !== item.id));
        this.pendingDelete.set(null);
      },
      error: (err) => {
        this.pendingDelete.set(null);
        this.errorMessage.set(err.error?.message ?? "Une erreur est survenue lors de la suppression.");
      },
    });
  }
}
