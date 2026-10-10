import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

// Longueur fixe des codes générés par UserController::generateBarcode côté API — déclenche la
// connexion dès que le scanner a fini de "taper" le code, sans attendre son Entrée de fin (tous
// les scanners n'en envoient pas une, selon leur config).
const LOGIN_BARCODE_LENGTH = 12;

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

  barcode = signal('');
  barcodeSaving = signal(false);
  barcodeError = signal<string | null>(null);

  selectUser(name: string): void {
    this.name.set(name);
    this.errorMessage.set(null);
  }

  onBarcodeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.barcode.set(value);
    this.barcodeError.set(null);

    if (value.length >= LOGIN_BARCODE_LENGTH) {
      this.submitBarcode();
    }
  }

  submitBarcode(): void {
    const barcode = this.barcode().trim();
    if (!barcode || this.barcodeSaving()) return;

    this.barcodeSaving.set(true);
    this.barcodeError.set(null);

    this.auth.loginBarcode(barcode).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => {
        this.barcodeSaving.set(false);
        this.barcodeError.set('Badge non reconnu.');
        this.barcode.set('');
      },
    });
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
