import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { NETTOYAGE_FREQUENCES, NettoyageTachePayload } from '../../core/models/nettoyage-tache.model';
import { Station } from '../../core/models/station.model';
import { NettoyageTacheService } from '../../core/services/nettoyage-tache.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';

@Component({
  selector: 'app-nettoyage-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './nettoyage-form.html',
  styleUrl: './nettoyage-form.css',
})
export class NettoyageForm implements OnInit {
  private readonly nettoyageService = inject(NettoyageTacheService);
  private readonly stationService = new SimpleEntityService<Station>(inject(HttpClient), 'stations');
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly frequences = NETTOYAGE_FREQUENCES;

  editingId = signal<number | null>(null);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  /** Suggestions du champ zone : zones déjà utilisées dans le plan + postes de cuisine. La zone
   * reste un texte libre (plonge, chambre froide… ne sont pas des postes). */
  zoneSuggestions = signal<string[]>([]);

  isEdit = computed(() => this.editingId() !== null);

  form = new FormGroup({
    zone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    frequence: new FormControl('apres_service', { nonNullable: true, validators: [Validators.required] }),
    moment: new FormControl('', { nonNullable: true }),
    responsable: new FormControl('', { nonNullable: true }),
    produit: new FormControl('', { nonNullable: true }),
    methode: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.nettoyageService.list().subscribe((taches) => this.addSuggestions(taches.map((t) => t.zone)));
    this.stationService.list().subscribe((stations) => this.addSuggestions(stations.map((s) => s.name)));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editingId.set(id);
      this.nettoyageService.get(id).subscribe((tache) => {
        this.form.patchValue({
          zone: tache.zone,
          name: tache.name,
          frequence: tache.frequence,
          moment: tache.moment ?? '',
          responsable: tache.responsable ?? '',
          produit: tache.produit ?? '',
          methode: tache.methode ?? '',
        });
      });
    }
  }

  private addSuggestions(zones: string[]): void {
    this.zoneSuggestions.update((current) =>
      [...new Set([...current, ...zones])].sort((a, b) => a.localeCompare(b, 'fr')),
    );
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: NettoyageTachePayload = {
      zone: value.zone.trim(),
      name: value.name.trim(),
      frequence: value.frequence,
      moment: value.moment.trim() || null,
      responsable: value.responsable.trim() || null,
      produit: value.produit.trim() || null,
      methode: value.methode.trim() || null,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.isEdit()
      ? this.nettoyageService.update(this.editingId()!, payload)
      : this.nettoyageService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
