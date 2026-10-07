import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { AuthService } from './auth.service';
import { PrintedLabelService } from './printed-label.service';
import { QueuedLabel } from '../models/label.model';

/**
 * File d'étiquettes à imprimer, partagée entre la page de composition (/etiquettes) et la page
 * de listes enregistrées (/etiquettes/listes) — `providedIn: 'root'` fait persister la file
 * quand on navigue de l'une à l'autre (ex. "ajouter la sélection d'une liste à la file" puis
 * retour sur /etiquettes pour imprimer). Comportement inchangé par rapport à l'ancienne version
 * où cet état vivait directement dans le composant `Labels`.
 */
@Injectable({ providedIn: 'root' })
export class LabelQueueService {
  private readonly auth = inject(AuthService);
  private readonly printedLabelService = inject(PrintedLabelService);

  private nextId = 0;

  queue = signal<QueuedLabel[]>([]);

  printingOnZebra = signal(false);
  zebraError = signal<string | null>(null);

  /** Total physical labels queued, copies included — what "Imprimer tout" will actually print. */
  totalLabelCount = computed(() => this.queue().reduce((sum, item) => sum + item.quantity, 0));

  /** Queue expanded so each copy is its own entry — one per physical label, for the browser print fallback. */
  printableLabels = computed(() => this.queue().flatMap((item) => Array.from({ length: item.quantity }, () => item)));

  /** Appends one label to the queue (used by the composer on /etiquettes). */
  add(item: Omit<QueuedLabel, 'id' | 'madeBy'>): void {
    this.queue.update((items) => [...items, { ...item, id: this.nextId++, madeBy: this.currentUserName() }]);
  }

  /** Appends several labels at once (used when adding a saved list's selection to the queue). */
  addMany(items: Omit<QueuedLabel, 'id' | 'madeBy'>[]): void {
    const madeBy = this.currentUserName();
    const withIds = items.map((item) => ({ ...item, id: this.nextId++, madeBy }));
    this.queue.update((current) => [...current, ...withIds]);
  }

  remove(id: number): void {
    this.queue.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    this.queue.set([]);
  }

  printQueueViaBrowser(): void {
    if (this.queue().length === 0) return;
    // window.print() est fire-and-forget (impossible de savoir si l'impression a réellement
    // abouti côté navigateur), donc on trace l'intention au moment du clic plutôt qu'après coup.
    this.recordPrint('browser');
    window.print();
  }

  printQueueOnZebra(): void {
    if (this.queue().length === 0 || this.printingOnZebra()) return;

    this.printingOnZebra.set(true);
    this.zebraError.set(null);

    const requests = this.queue().map((item) =>
      this.printedLabelService.printZebra({
        type_key: item.type.key,
        product_name: item.productName,
        date: item.date,
        use_by_date: item.useByDate,
        quantity: item.quantity,
      }),
    );

    forkJoin(requests).subscribe({
      // Ici, contrairement à window.print(), le serveur confirme l'impression réelle avant de
      // répondre — pas besoin d'un recordPrint séparé, printZebra journalise déjà côté serveur.
      // On vide la file après coup : sinon un produit resté de la fois précédente se réimprime
      // silencieusement avec le suivant (vécu : 2 étiquettes sorties pour 1 ajoutée).
      next: () => {
        this.printingOnZebra.set(false);
        this.clear();
      },
      error: (error) => {
        this.printingOnZebra.set(false);
        this.zebraError.set(error?.error?.message ?? "Une erreur est survenue lors de l'impression.");
      },
    });
  }

  private currentUserName(): string {
    return this.auth.user()?.name ?? '';
  }

  /**
   * Journalise chaque étiquette de la file pour la traçabilité HACCP (une ligne par entrée de
   * file, avec sa quantité). Fire-and-forget et erreurs ignorées volontairement : l'impression
   * réelle des étiquettes ne doit jamais être bloquée ou retardée par un souci d'historique.
   * Uniquement pour le fallback navigateur — le chemin Zebra journalise déjà côté serveur.
   */
  private recordPrint(via: 'browser'): void {
    for (const item of this.queue()) {
      this.printedLabelService
        .create({
          type_key: item.type.key,
          product_name: item.productName,
          date: item.date,
          use_by_date: item.useByDate,
          quantity: item.quantity,
          printed_via: via,
        })
        .subscribe({ error: () => {} });
    }
  }
}
