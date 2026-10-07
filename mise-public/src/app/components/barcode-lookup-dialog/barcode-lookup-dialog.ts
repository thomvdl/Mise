import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';

import { BarcodeService } from '../../core/services/barcode.service';

/**
 * Dialogue séparé pour scanner/taper un code-barres EAN et récupérer le nom du produit
 * (proxy Open Food Facts côté API — voir BarcodeController). Ouvert depuis labels.ts à côté du
 * lien "Mes listes enregistrées" plutôt que mêlé au formulaire de composition d'étiquette.
 */
@Component({
  selector: 'app-barcode-lookup-dialog',
  imports: [],
  templateUrl: './barcode-lookup-dialog.html',
  styleUrl: './barcode-lookup-dialog.css',
})
export class BarcodeLookupDialog {
  private readonly barcodeService = inject(BarcodeService);
  private readonly eanInput = viewChild<ElementRef<HTMLInputElement>>('eanInput');

  open = signal(false);
  ean = signal('');
  loading = signal(false);
  error = signal<string | null>(null);

  /** Émis avec le nom trouvé — à la charge de l'appelant de s'en servir (ex. préremplir "Produit"). */
  found = output<string>();

  show(): void {
    this.open.set(true);
    this.ean.set('');
    this.error.set(null);
    // L'input n'existe dans le DOM qu'une fois le `@if` rendu par ce même changement — un
    // setTimeout(0) laisse ce rendu se faire avant de tenter le focus (`autofocus` ne se
    // déclenche pas pour un élément inséré dynamiquement, seulement au chargement de la page).
    setTimeout(() => this.eanInput()?.nativeElement.focus());
  }

  close(): void {
    this.open.set(false);
  }

  onEanInput(event: Event): void {
    this.ean.set((event.target as HTMLInputElement).value.trim());
    this.error.set(null);
  }

  lookup(): void {
    const ean = this.ean().trim();
    if (!ean || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.barcodeService.lookup(ean).subscribe({
      next: ({ name }) => {
        this.loading.set(false);
        this.found.emit(name);
        this.close();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Produit introuvable pour ce code-barres.');
      },
    });
  }
}
