import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PictureService } from '../../core/services/picture.service';
import { Picture } from '../../core/models/picture.model';

/**
 * Galerie en lecture seule — l'import, la liaison et la suppression d'une photo se gèrent depuis
 * la fiche technique concernée (voir fiche-technique-form), pas ici. Cette page ne fait plus que
 * montrer l'ensemble des photos déjà importées et où chacune est utilisée, pour s'y retrouver
 * dans la photothèque sans devoir ouvrir chaque fiche une par une.
 *
 * N'affiche que les photos liées à une fiche technique — une photo non liée n'a pas sa place dans
 * cette galerie de consultation (elle traîne dans la base mais n'intéresse personne tant qu'elle
 * n'est pas rattachée à quelque chose).
 */
@Component({
  selector: 'app-photo-list',
  imports: [RouterLink],
  templateUrl: './photo-list.html',
  styleUrl: './photo-list.css',
})
export class PhotoList implements OnInit {
  private readonly pictureService = inject(PictureService);

  pictures = signal<Picture[]>([]);
  lightboxPicture = signal<Picture | null>(null);

  linkedPictures = computed(() => this.pictures().filter((picture) => picture.fiche_technique !== null));

  ngOnInit(): void {
    this.pictureService.list().subscribe((items) => this.pictures.set(items));
  }

  openLightbox(picture: Picture): void {
    this.lightboxPicture.set(picture);
  }

  closeLightbox(): void {
    this.lightboxPicture.set(null);
  }

  /** Document-wide plutôt que scopé à un élément : le lightbox est une superposition plein écran,
   *  rien d'autre sur la page ne doit intercepter Échap pendant qu'il est ouvert. No-op si fermé. */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeLightbox();
  }
}
