import { Component, OnInit, inject, signal } from '@angular/core';

import { Friteuse } from '../../core/models/friteuse.model';
import { FriteuseService } from '../../core/services/friteuse.service';
import { ChangementHuileService } from '../../core/services/changement-huile.service';
import { isChangeOverdue, lastChangeDate, nextChangeDate, sortedHistory } from '../../core/utils/friteuse-schedule';

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

@Component({
  selector: 'app-huile',
  imports: [],
  templateUrl: './huile.html',
  styleUrl: './huile.css',
})
export class Huile implements OnInit {
  private readonly friteuseService = inject(FriteuseService);
  private readonly changementHuileService = inject(ChangementHuileService);

  friteuses = signal<Friteuse[]>([]);

  /** Toujours aujourd'hui — ni antidate ni postdate possible, le champ n'est affiché qu'à titre indicatif. */
  readonly today = toIsoDate(new Date());

  expandedHistory = signal<Set<number>>(new Set());
  saving = signal<number | null>(null);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.friteuseService.list().subscribe((items) => this.friteuses.set(items));
  }

  lastChange(friteuse: Friteuse): string | null {
    return lastChangeDate(friteuse);
  }

  nextChange(friteuse: Friteuse): Date | null {
    return nextChangeDate(friteuse);
  }

  overdue(friteuse: Friteuse): boolean {
    return isChangeOverdue(friteuse);
  }

  history(friteuse: Friteuse) {
    return sortedHistory(friteuse);
  }

  isExpanded(friteuseId: number): boolean {
    return this.expandedHistory().has(friteuseId);
  }

  toggleHistory(friteuseId: number): void {
    this.expandedHistory.update((set) => {
      const next = new Set(set);
      next.has(friteuseId) ? next.delete(friteuseId) : next.add(friteuseId);
      return next;
    });
  }

  /** `new Date("YYYY-MM-DD")` parses as UTC midnight, which can display as the previous day in
   *  timezones behind UTC — parsing the components locally avoids that off-by-one. */
  formatDate(value: string | Date): string {
    const date =
      typeof value === 'string'
        ? (() => {
            const [year, month, day] = value.split('-').map(Number);
            return new Date(year, month - 1, day);
          })()
        : value;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  addChange(friteuse: Friteuse): void {
    this.saving.set(friteuse.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.changementHuileService.create({ friteuse_id: friteuse.id, date_changement: this.today }).subscribe({
      next: () => {
        this.saving.set(null);
        this.successMessage.set(`Changement enregistré pour ${friteuse.name}.`);
        this.reload();
      },
      error: () => {
        this.saving.set(null);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
