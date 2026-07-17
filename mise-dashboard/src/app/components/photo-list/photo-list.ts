import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';

import { PictureService } from '../../core/services/picture.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { Picture } from '../../core/models/picture.model';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-photo-list',
  imports: [ConfirmDialog],
  templateUrl: './photo-list.html',
  styleUrl: './photo-list.css',
})
export class PhotoList implements OnInit {
  private readonly pictureService = inject(PictureService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);

  fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  pictures = signal<Picture[]>([]);
  ficheTechniques = signal<FicheTechnique[]>([]);
  uploading = signal(false);
  errorMessage = signal<string | null>(null);
  pendingDelete = signal<Picture | null>(null);

  deleteMessage = computed(() => {
    const picture = this.pendingDelete();
    return picture ? 'Supprimer cette photo ? Cette action est irréversible.' : '';
  });

  ngOnInit(): void {
    this.reload();
    this.ficheTechniqueService.list().subscribe((items) => this.ficheTechniques.set(items));
  }

  reload(): void {
    this.pictureService.list().subscribe((items) => this.pictures.set(items));
  }

  triggerUpload(): void {
    this.fileInput().nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (files.length === 0) return;

    this.uploading.set(true);
    this.errorMessage.set(null);

    this.pictureService.upload(files).subscribe({
      next: (uploaded) => {
        this.uploading.set(false);
        this.pictures.update((items) => [...uploaded, ...items]);
      },
      error: () => {
        this.uploading.set(false);
        this.errorMessage.set(
          "Une erreur est survenue lors de l'import (formats acceptés : jpg, png, gif, webp — 2 Mo max par fichier).",
        );
      },
    });
  }

  onLinkChange(picture: Picture, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const ficheTechniqueId = value ? Number(value) : null;

    this.pictureService.link(picture.id, ficheTechniqueId).subscribe((updated) => {
      this.pictures.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    });
  }

  confirmDelete(picture: Picture): void {
    this.pendingDelete.set(picture);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const picture = this.pendingDelete();
    if (!picture) return;

    this.pictureService.delete(picture.id).subscribe(() => {
      this.pictures.update((items) => items.filter((item) => item.id !== picture.id));
      this.pendingDelete.set(null);
    });
  }
}
