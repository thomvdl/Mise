import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LabelTypeService } from '../../core/services/label-type.service';
import { ICON_KEYS, LabelTypeRecord } from '../../core/models/label.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { LabelIcon } from '../label-icon/label-icon';

/**
 * Types d'étiquette (OUVERT LE, PRODUIT LE, ...) — autrefois codés en dur (voir
 * ZplLabelBuilder::LABEL_TYPES, supprimé), maintenant une ressource normale gérée ici. La `key`
 * reste figée après création : elle est référencée telle quelle par l'historique des étiquettes
 * déjà imprimées (`printed_labels.type_key`), la changer casserait ces enregistrements.
 */
@Component({
  selector: 'app-label-type-settings',
  imports: [FormsModule, RouterLink, ConfirmDialog, LabelIcon],
  templateUrl: './label-type-settings.html',
  styleUrl: './label-type-settings.css',
})
export class LabelTypeSettings implements OnInit {
  private readonly labelTypeService = inject(LabelTypeService);

  readonly iconKeys = ICON_KEYS;

  types = signal<LabelTypeRecord[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  editingId = signal<number | 'new' | null>(null);
  editKey = signal('');
  editName = signal('');
  editJplusDays = signal<number | null>(null);
  editIconKey = signal<string>('generique');
  saving = signal(false);
  saveError = signal<string | null>(null);

  pendingDelete = signal<LabelTypeRecord | null>(null);

  canSave = computed(() => this.editKey().trim().length > 0 && this.editName().trim().length > 0);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.labelTypeService.listRecords().subscribe({
      next: (types) => {
        this.types.set(types);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les types.');
        this.loading.set(false);
      },
    });
  }

  startCreate(): void {
    this.editingId.set('new');
    this.editKey.set('');
    this.editName.set('');
    this.editJplusDays.set(null);
    this.editIconKey.set('generique');
    this.saveError.set(null);
  }

  startEdit(type: LabelTypeRecord): void {
    this.editingId.set(type.id);
    this.editKey.set(type.key);
    this.editName.set(type.name);
    this.editJplusDays.set(type.jplus_days);
    this.editIconKey.set(type.icon_key ?? 'generique');
    this.saveError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  /** La clé ne sert qu'à l'identification technique — lettres/chiffres/tirets, comme un slug. */
  onKeyInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.editKey.set(
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9_-]/g, '_'),
    );
  }

  onNameInput(event: Event): void {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  onJplusInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.editJplusDays.set(value === '' ? null : Number(value));
  }

  selectIcon(icon: string): void {
    this.editIconKey.set(icon);
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;

    const editingId = this.editingId();
    const payload = {
      key: this.editKey().trim(),
      name: this.editName().trim(),
      jplus_days: this.editJplusDays(),
      icon_key: this.editIconKey(),
    };

    this.saving.set(true);
    this.saveError.set(null);

    const request =
      editingId === 'new' ? this.labelTypeService.create(payload) : this.labelTypeService.update(editingId!, payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editingId.set(null);
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message ?? "Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }

  confirmDelete(type: LabelTypeRecord): void {
    this.pendingDelete.set(type);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const type = this.pendingDelete();
    if (!type) return;

    this.labelTypeService.delete(type.id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        this.reload();
      },
      error: () => {
        this.pendingDelete.set(null);
        this.errorMessage.set("Suppression impossible — réessayez, ou contactez l'administrateur.");
      },
    });
  }
}
