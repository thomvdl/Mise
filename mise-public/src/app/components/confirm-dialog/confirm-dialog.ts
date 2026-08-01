import { Component, input, output } from '@angular/core';

/** Même API que ConfirmDialog côté mise-dashboard (pas de package partagé entre les deux repos, voir CONTEXT.md) — gardé identique pour rester cohérent si on repasse de l'un à l'autre. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  open = input(false);
  title = input('Confirmer');
  message = input('');
  confirmLabel = input('Confirmer');
  cancelLabel = input('Annuler');

  confirm = output<void>();
  cancel = output<void>();
}
