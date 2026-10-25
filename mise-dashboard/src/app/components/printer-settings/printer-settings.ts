import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LocalPrinterService } from '../../core/services/local-printer.service';
import { Printer, PrinterPayload, PrinterType } from '../../core/models/printer.model';
import { PrinterService } from '../../core/services/printer.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

interface LabelFormatPreset {
  label: string;
  widthMm: number;
  heightMm: number;
  rotate90: boolean;
  /**
   * Compense une zone morte mécanique propre à l'imprimante (tête/capteur décalés physiquement),
   * mesurée étiquette graduée à l'appui — ~7,5mm constatés en 57x32mm. Pas (encore) mesurée pour
   * 36x89mm pivoté, donc 0 par défaut pour ce format plutôt que de deviner une valeur qui pourrait
   * casser un format qui marchait déjà.
   */
  topOffsetMm: number;
}

/**
 * Préréglages des deux formats de rouleau utilisés en cuisine, pour éviter de ressaisir
 * largeur/hauteur/rotation à la main (et de se tromper) à chaque changement de support. Le
 * rouleau pivoté fait réellement 36mm de large (pas 38 — un ancien preset à 38mm provoquait une
 * étiquette correcte suivie de 2 étiquettes vierges à l'impression, capteur de gap de
 * l'imprimante déboussolé par l'écart ; confirmé résolu en repassant à 36mm à la main).
 */
const LABEL_FORMAT_PRESETS: LabelFormatPreset[] = [
  { label: '36 × 89 mm (pivoté 90°)', widthMm: 36, heightMm: 89, rotate90: true, topOffsetMm: 0 },
  { label: '57 × 32 mm', widthMm: 57, heightMm: 32, rotate90: false, topOffsetMm: 7.5 },
];

const DEFAULT_PAYLOAD: PrinterPayload = {
  name: '',
  type: 'label',
  ip: '',
  dpi: 203,
  label_width_mm: 57,
  label_height_mm: 32,
  rotate_90: false,
  top_offset_mm: 0,
  paper_width_mm: null,
  is_default: false,
};

/** Les deux largeurs de rouleau ESC/POS standard du marché (voir PrinterController::rules côté
 * API, qui n'accepte que ces deux valeurs) — pas un champ libre comme label_width_mm, ce champ ne
 * pilote qu'un nombre de caractères par ligne côté builder, pas une vraie mesure physique à régler
 * au mm près. */
const PAPER_WIDTH_PRESETS = [58, 80];

/**
 * Plusieurs postes, chacun avec sa Zebra et son format de rouleau (voir Printer côté API — a
 * remplacé l'unique couple de réglages `printer_ip`/`label_*` d'avant). Quelle imprimante CE poste
 * utilise reste un choix local au navigateur (voir LocalPrinterService), pas une donnée qu'un
 * admin configure ici pour tout le monde.
 */
@Component({
  selector: 'app-printer-settings',
  imports: [FormsModule, RouterLink, ConfirmDialog],
  templateUrl: './printer-settings.html',
  styleUrl: './printer-settings.css',
})
export class PrinterSettings implements OnInit {
  private readonly printerService = inject(PrinterService);
  readonly localPrinter = inject(LocalPrinterService);

  readonly labelFormatPresets = LABEL_FORMAT_PRESETS;
  readonly paperWidthPresets = PAPER_WIDTH_PRESETS;

  printers = signal<Printer[]>([]);
  labelPrinters = computed(() => this.printers().filter((p) => p.type === 'label'));
  thermalPrinters = computed(() => this.printers().filter((p) => p.type === 'thermal'));
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  editingId = signal<number | 'new' | null>(null);
  editForm = signal<PrinterPayload>({ ...DEFAULT_PAYLOAD });
  saving = signal(false);
  saveError = signal<string | null>(null);

  isThermal = computed(() => this.editForm().type === 'thermal');

  pendingDelete = signal<Printer | null>(null);

  canSave = computed(() => this.editForm().name.trim().length > 0 && this.editForm().ip.trim().length > 0);

  activePresetLabel = computed(() => {
    const value = this.editForm();
    const match = this.labelFormatPresets.find(
      (preset) =>
        value.label_width_mm === preset.widthMm &&
        value.label_height_mm === preset.heightMm &&
        value.rotate_90 === preset.rotate90 &&
        value.top_offset_mm === preset.topOffsetMm,
    );
    return match?.label ?? '';
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.printerService.list().subscribe({
      next: (printers) => {
        this.printers.set(printers);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les imprimantes.');
        this.loading.set(false);
      },
    });
  }

  /** Change l'imprimante de CE poste — réglage local au navigateur, pas envoyé au serveur. */
  selectLocalPrinter(value: string): void {
    this.localPrinter.set(value === '' ? null : Number(value));
  }

  selectLocalThermalPrinter(value: string): void {
    this.localPrinter.setThermal(value === '' ? null : Number(value));
  }

  startCreate(type: PrinterType = 'label'): void {
    this.editingId.set('new');
    const sameType = this.printers().filter((p) => p.type === type);
    this.editForm.set({
      ...DEFAULT_PAYLOAD,
      type,
      paper_width_mm: type === 'thermal' ? 80 : null,
      is_default: sameType.length === 0,
    });
    this.saveError.set(null);
  }

  startEdit(printer: Printer): void {
    this.editingId.set(printer.id);
    this.editForm.set({
      name: printer.name,
      type: printer.type,
      ip: printer.ip,
      dpi: printer.dpi,
      label_width_mm: printer.label_width_mm,
      label_height_mm: printer.label_height_mm,
      rotate_90: printer.rotate_90,
      top_offset_mm: printer.top_offset_mm,
      paper_width_mm: printer.paper_width_mm,
      is_default: printer.is_default,
    });
    this.saveError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  patchForm(patch: Partial<PrinterPayload>): void {
    this.editForm.update((form) => ({ ...form, ...patch }));
  }

  patchPaperWidth(value: string): void {
    this.patchForm({ paper_width_mm: Number(value) });
  }

  selectPreset(label: string): void {
    const preset = this.labelFormatPresets.find((p) => p.label === label);
    if (!preset) return;

    this.patchForm({
      label_width_mm: preset.widthMm,
      label_height_mm: preset.heightMm,
      rotate_90: preset.rotate90,
      top_offset_mm: preset.topOffsetMm,
    });
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;

    const editingId = this.editingId();
    const payload: PrinterPayload = { ...this.editForm(), name: this.editForm().name.trim(), ip: this.editForm().ip.trim() };

    this.saving.set(true);
    this.saveError.set(null);

    const request = editingId === 'new' ? this.printerService.create(payload) : this.printerService.update(editingId!, payload);

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

  confirmDelete(printer: Printer): void {
    this.pendingDelete.set(printer);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const printer = this.pendingDelete();
    if (!printer) return;

    this.printerService.delete(printer.id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        if (this.localPrinter.printerId() === printer.id) this.localPrinter.set(null);
        if (this.localPrinter.thermalPrinterId() === printer.id) this.localPrinter.setThermal(null);
        this.reload();
      },
      error: () => {
        this.pendingDelete.set(null);
        this.errorMessage.set("Suppression impossible — réessayez, ou contactez l'administrateur.");
      },
    });
  }
}
