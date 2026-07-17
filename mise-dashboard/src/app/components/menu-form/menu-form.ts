import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MenuService } from '../../core/services/menu.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { MenuPayload } from '../../core/models/menu.model';
import { slugify } from '../../core/utils/slugify';
import { FicheTechniquePicker } from '../fiche-technique-picker/fiche-technique-picker';

type PlatRow = FormGroup<{
  name: FormControl<string>;
  description: FormControl<string>;
  fiche_technique_ids: FormControl<number[]>;
}>;

type SectionRow = FormGroup<{
  name: FormControl<string>;
  plats: FormArray<PlatRow>;
}>;

@Component({
  selector: 'app-menu-form',
  imports: [ReactiveFormsModule, RouterLink, FicheTechniquePicker],
  templateUrl: './menu-form.html',
  styleUrl: './menu-form.css',
})
export class MenuForm implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  editingId = signal<number | null>(null);
  slugTouched = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  ficheTechniques = signal<FicheTechnique[]>([]);
  oneShot = signal(false);

  isEdit = computed(() => this.editingId() !== null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl(''),
    starts_at: new FormControl<string | null>(null),
    ends_at: new FormControl<string | null>(null),
  });

  sections = new FormArray<SectionRow>([]);

  ngOnInit(): void {
    this.ficheTechniqueService.list().subscribe((items) => this.ficheTechniques.set(items));

    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugTouched()) {
        this.form.controls.slug.setValue(slugify(name), { emitEvent: false });
      }
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editingId.set(id);
      this.slugTouched.set(true);

      this.menuService.get(id).subscribe((menu) => {
        this.form.patchValue({
          name: menu.name,
          slug: menu.slug,
          description: menu.description ?? '',
          starts_at: menu.starts_at,
          ends_at: menu.ends_at,
        });
        this.oneShot.set(menu.starts_at !== null && menu.starts_at === menu.ends_at);

        for (const section of menu.sections ?? []) {
          const sectionRow = this.buildSectionRow(section.name);
          this.sections.push(sectionRow);

          for (const plat of section.plats ?? []) {
            sectionRow.controls.plats.push(
              this.buildPlatRow(
                plat.name,
                plat.description ?? '',
                (plat.fiche_techniques ?? []).map((fiche) => fiche.id),
              ),
            );
          }
        }

        if (this.sections.length === 0) {
          this.addSection();
        }
      });
    } else {
      this.addSection();
    }
  }

  onSlugInput(): void {
    this.slugTouched.set(true);
  }

  toggleOneShot(): void {
    this.oneShot.update((value) => !value);
  }

  private buildPlatRow(name: string, description: string, ficheTechniqueIds: number[]): PlatRow {
    return new FormGroup({
      name: new FormControl(name, { nonNullable: true, validators: [Validators.required] }),
      description: new FormControl(description, { nonNullable: true }),
      fiche_technique_ids: new FormControl(ficheTechniqueIds, { nonNullable: true }),
    });
  }

  private buildSectionRow(name: string): SectionRow {
    return new FormGroup({
      name: new FormControl(name, { nonNullable: true, validators: [Validators.required] }),
      plats: new FormArray<PlatRow>([]),
    });
  }

  addSection(): void {
    const section = this.buildSectionRow('');
    section.controls.plats.push(this.buildPlatRow('', '', []));
    this.sections.push(section);
  }

  removeSection(index: number): void {
    this.sections.removeAt(index);
  }

  addPlat(sectionIndex: number): void {
    this.sections.at(sectionIndex).controls.plats.push(this.buildPlatRow('', '', []));
  }

  removePlat(sectionIndex: number, platIndex: number): void {
    this.sections.at(sectionIndex).controls.plats.removeAt(platIndex);
  }

  isFicheTechniqueSelected(sectionIndex: number, platIndex: number, ficheId: number): boolean {
    const control = this.sections.at(sectionIndex).controls.plats.at(platIndex).controls.fiche_technique_ids;
    return control.value.includes(ficheId);
  }

  toggleFicheTechnique(sectionIndex: number, platIndex: number, ficheId: number): void {
    const control = this.sections.at(sectionIndex).controls.plats.at(platIndex).controls.fiche_technique_ids;
    const current = control.value;
    const next = current.includes(ficheId) ? current.filter((id) => id !== ficheId) : [...current, ficheId];
    control.setValue(next);
  }

  save(): void {
    this.sections.markAllAsTouched();

    if (this.form.invalid || this.sections.invalid || this.sections.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const startsAt = value.starts_at || null;
    const endsAt = this.oneShot() ? startsAt : value.ends_at || null;

    const payload: MenuPayload = {
      name: value.name,
      slug: value.slug,
      description: value.description || null,
      starts_at: startsAt,
      ends_at: endsAt,
      sections: this.sections.controls.map((section) => ({
        name: section.controls.name.value,
        plats: section.controls.plats.controls.map((plat) => ({
          name: plat.controls.name.value,
          description: plat.controls.description.value || null,
          fiche_technique_ids: plat.controls.fiche_technique_ids.value,
        })),
      })),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.isEdit()
      ? this.menuService.update(this.editingId()!, payload)
      : this.menuService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set("Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
