import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'mise_local_printer_id';

/**
 * Quelle imprimante CE poste (ce navigateur) utilise — propre à la machine (localStorage), jamais
 * envoyé par un autre poste ni connu du serveur avant l'impression. Permet à plusieurs postes qui
 * partagent la même API d'imprimer chacun sur sa propre Zebra sans se marcher dessus (voir
 * Printer côté API, résolu par Printer::resolve si l'id choisi ici ne correspond plus à rien).
 */
@Injectable({ providedIn: 'root' })
export class LocalPrinterService {
  printerId = signal<number | null>(this.readStored());

  private readStored(): number | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  }

  set(id: number | null): void {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
    this.printerId.set(id);
  }
}
