import { Injectable, signal } from '@angular/core';

import { PrinterType } from '../models/printer.model';

const STORAGE_KEYS: Record<PrinterType, string> = {
  label: 'mise_local_printer_id',
  thermal: 'mise_local_thermal_printer_id',
};

/**
 * Quelle imprimante CE poste (ce navigateur) utilise, PAR TYPE — propre à la machine
 * (localStorage), jamais envoyé par un autre poste ni connu du serveur avant l'impression. Un
 * poste peut choisir indépendamment son étiqueteuse et son ticket thermique (deux clés de
 * stockage séparées, voir STORAGE_KEYS) — permet à plusieurs postes qui partagent la même API
 * d'imprimer chacun sur son propre matériel sans se marcher dessus (voir Printer côté API,
 * résolu par Printer::resolve si l'id choisi ici ne correspond plus à rien, ou plus au bon type).
 *
 * La clé `label` garde volontairement son ancien nom de stockage (`mise_local_printer_id`, pas
 * `mise_local_label_printer_id`) : c'était déjà "la" clé d'imprimante avant l'introduction du
 * ticket thermique, pas la peine de faire perdre son choix à chaque poste déjà configuré en
 * renommant la clé au passage.
 */
@Injectable({ providedIn: 'root' })
export class LocalPrinterService {
  printerId = signal<number | null>(this.readStored('label'));
  thermalPrinterId = signal<number | null>(this.readStored('thermal'));

  private readStored(type: PrinterType): number | null {
    const raw = localStorage.getItem(STORAGE_KEYS[type]);
    return raw ? Number(raw) : null;
  }

  set(id: number | null): void {
    this.setFor('label', id);
  }

  setThermal(id: number | null): void {
    this.setFor('thermal', id);
  }

  private setFor(type: PrinterType, id: number | null): void {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEYS[type]);
    } else {
      localStorage.setItem(STORAGE_KEYS[type], String(id));
    }
    (type === 'label' ? this.printerId : this.thermalPrinterId).set(id);
  }
}
