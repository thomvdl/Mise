import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Powers the account picker — falls back to free text entry if it can't be reached (offline). */
  users = toSignal(this.auth.listUsers(), { initialValue: [] });

  name = signal('');
  password = signal('');
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  selectUser(name: string): void {
    this.name.set(name);
    this.errorMessage.set(null);
  }

  submit(): void {
    if (!this.name().trim() || !this.password()) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    this.auth.login(this.name().trim(), this.password()).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Nom ou mot de passe incorrect.');
      },
    });
  }
}
