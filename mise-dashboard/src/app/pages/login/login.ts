import { Component, inject, signal } from '@angular/core';
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

  name = signal('');
  password = signal('');
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  submit(): void {
    if (!this.name().trim() || !this.password()) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    this.auth.login(this.name().trim(), this.password()).subscribe({
      next: () => {
        if (this.auth.isAdmin()) {
          this.router.navigateByUrl('/');
        } else {
          this.auth.clearSession();
          this.errorMessage.set('Ce dashboard est réservé aux administrateurs.');
        }
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Nom ou mot de passe incorrect.');
      },
    });
  }
}
