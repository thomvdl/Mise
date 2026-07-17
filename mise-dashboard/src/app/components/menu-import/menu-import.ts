import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MenuService } from '../../core/services/menu.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { MenuPayload } from '../../core/models/menu.model';
import {
  ParsedMenu,
  ParsedMenuBlock,
  ParsedMenuSection,
  ParsedPlat,
  parseMultipleMenus,
} from '../../core/utils/menu-markdown';
import { slugify } from '../../core/utils/slugify';

const EXAMPLE = `# Menu du dimanche
Description: Menu brunch dominical, à préparer pour le service du dimanche midi.
Début: 2026-07-20
Fin: 2026-07-20

## Entrées
### Velouté de saison
Une soupe légère pour ouvrir le repas.

### Salade composée

## Brunch
### Crêpes sucrées
Fiches: Crêpes sucrées

### Pain perdu
Servi avec un coulis de fruits rouges.
Fiches: Pain perdu

# Menu de semaine
Début: 2026-07-21
Fin: 2026-07-25

## Plats
### Plat du jour
`;

interface ResolvedFicheTechnique {
  name: string;
  matched: FicheTechnique | null;
}

interface ResolvedPlat {
  plat: ParsedPlat;
  fiches: ResolvedFicheTechnique[];
}

interface ResolvedSection {
  section: ParsedMenuSection;
  plats: ResolvedPlat[];
}

interface ResolvedMenuBlock {
  block: ParsedMenuBlock;
  sections: ResolvedSection[];
}

@Component({
  selector: 'app-menu-import',
  imports: [],
  templateUrl: './menu-import.html',
  styleUrl: './menu-import.css',
})
export class MenuImport {
  private readonly menuService = inject(MenuService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly router = inject(Router);

  markdownText = signal(EXAMPLE);
  ficheTechniques = signal<FicheTechnique[]>([]);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.ficheTechniqueService.list().subscribe((items) => this.ficheTechniques.set(items));
  }

  blocks = computed(() => parseMultipleMenus(this.markdownText()));

  resolved = computed<ResolvedMenuBlock[]>(() => {
    const ficheTechniques = this.ficheTechniques();

    return this.blocks().map((block) => {
      if (!block.value) {
        return { block, sections: [] };
      }

      return {
        block,
        sections: block.value.sections.map((section) => ({
          section,
          plats: section.plats.map((plat) => ({
            plat,
            fiches: plat.ficheTechniques.map((name) => ({
              name,
              matched: ficheTechniques.find((fiche) => slugify(fiche.name) === slugify(name)) ?? null,
            })),
          })),
        })),
      };
    });
  });

  validCount = computed(() => this.resolved().filter((r) => r.block.value !== null).length);
  errorCount = computed(() => this.resolved().filter((r) => r.block.value === null).length);

  onTextInput(event: Event): void {
    this.markdownText.set((event.target as HTMLTextAreaElement).value);
  }

  dateLabel(menu: ParsedMenu): string {
    if (!menu.startsAt) return '—';
    if (menu.endsAt === menu.startsAt) return menu.startsAt;
    if (!menu.endsAt) return `À partir du ${menu.startsAt}`;
    return `${menu.startsAt} → ${menu.endsAt}`;
  }

  save(): void {
    const validBlocks = this.resolved().filter((r) => r.block.value !== null);
    if (validBlocks.length === 0) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    const payloads = validBlocks.map((r) => this.buildPayload(r.block.value!, r));

    forkJoin(payloads.map((payload) => this.menuService.create(payload))).subscribe({
      next: () => this.router.navigate(['/menus']),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set(
          "Une erreur est survenue lors de la création (vérifiez que les slugs générés ne sont pas déjà utilisés).",
        );
      },
    });
  }

  private buildPayload(menu: ParsedMenu, resolvedBlock: ResolvedMenuBlock): MenuPayload {
    return {
      name: menu.name,
      slug: slugify(menu.name),
      description: menu.description,
      starts_at: menu.startsAt,
      ends_at: menu.endsAt,
      sections: resolvedBlock.sections.map((rs) => ({
        name: rs.section.name,
        plats: rs.plats.map((rp) => ({
          name: rp.plat.name,
          description: rp.plat.description,
          fiche_technique_ids: rp.fiches.filter((f) => f.matched).map((f) => f.matched!.id),
        })),
      })),
    };
  }
}
