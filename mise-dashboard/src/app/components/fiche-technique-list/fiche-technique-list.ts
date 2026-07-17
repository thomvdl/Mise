import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { ficheTechniqueToMarkdown, fichesTechniquesToMarkdown } from '../../core/utils/fiche-technique-markdown';
import { downloadTextFile } from '../../core/utils/download';

@Component({
  selector: 'app-fiche-technique-list',
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './fiche-technique-list.html',
  styleUrl: './fiche-technique-list.css',
})
export class FicheTechniqueList implements OnInit {
  private readonly ficheTechniqueService = inject(FicheTechniqueService);

  items = signal<FicheTechnique[]>([]);
  search = signal('');
  pendingDelete = signal<FicheTechnique | null>(null);

  filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.items();
    return this.items().filter((item) => item.name.toLowerCase().includes(query));
  });

  deleteMessage = computed(() => {
    const item = this.pendingDelete();
    return item ? `Supprimer la fiche technique « ${item.name} » ? Cette action est irréversible.` : '';
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.ficheTechniqueService.list().subscribe((items) => this.items.set(items));
  }

  confirmDelete(item: FicheTechnique): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.ficheTechniqueService.delete(item.id).subscribe(() => {
      this.items.update((items) => items.filter((i) => i.id !== item.id));
      this.pendingDelete.set(null);
    });
  }

  exportOne(item: FicheTechnique): void {
    downloadTextFile(`${item.slug}.md`, ficheTechniqueToMarkdown(item));
  }

  exportAll(): void {
    if (this.items().length === 0) return;
    downloadTextFile('fiches-techniques.md', fichesTechniquesToMarkdown(this.items()));
  }
}
