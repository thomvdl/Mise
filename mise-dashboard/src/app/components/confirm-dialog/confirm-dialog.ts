import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  open = input(false);
  title = input('Confirmer la suppression');
  message = input('Cette action est irréversible.');
  confirmLabel = input('Supprimer');
  cancelLabel = input('Annuler');

  confirm = output<void>();
  cancel = output<void>();
}
