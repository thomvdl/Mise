import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { NoteService } from '../../core/services/note.service';
import { Note } from '../../core/models/note.model';
import { renderMarkdown } from '../../core/utils/markdown';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

const AUTOSAVE_DELAY_MS = 700;

@Component({
  selector: 'app-notes',
  imports: [FormsModule, DatePipe, ConfirmDialog],
  templateUrl: './notes.html',
  styleUrl: './notes.css',
})
export class Notes implements OnInit, OnDestroy {
  private readonly noteService = inject(NoteService);

  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  notes = signal<Note[]>([]);
  activeId = signal<number | null>(null);

  /** Aplati (racines + enfants) pour retrouver n'importe quelle page par id sans recursion. */
  private readonly flatNotes = computed(() => this.notes().flatMap((n) => [n, ...n.children]));

  activeNote = computed(() => this.flatNotes().find((n) => n.id === this.activeId()) ?? null);

  /** Une sous-page ne peut pas elle-même avoir de sous-page (une seule profondeur autorisée). */
  canHaveChildren = computed(() => this.activeNote()?.parent_id == null);

  title = signal('');
  content = signal('');
  previewHtml = computed(() => renderMarkdown(this.content()));

  /** Une seule vue à la fois : le texte brut à éditer, ou son rendu — jamais les deux côte à côte. */
  viewMode = signal<'edit' | 'preview'>('preview');

  /** Style Notion : pas de bouton "Enregistrer", tout se sauvegarde tout seul en arrière-plan. */
  saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  pendingDelete = signal<Note | null>(null);
  deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadNotes();
  }

  ngOnDestroy(): void {
    // Best effort : si l'utilisateur quitte l'écran juste après avoir tapé, on tente quand
    // même d'envoyer la sauvegarde en attente plutôt que de la perdre silencieusement.
    this.flushSave();
  }

  loadNotes(selectId?: number): void {
    this.noteService.list().subscribe((notes) => {
      this.notes.set(notes);
      const flat = notes.flatMap((n) => [n, ...n.children]);

      if (selectId !== undefined) {
        this.select(selectId, flat);
      } else if (this.activeId() !== null) {
        const stillThere = flat.find((n) => n.id === this.activeId());
        if (stillThere) this.select(stillThere.id, flat);
        else this.activeId.set(null);
      } else if (flat.length > 0) {
        this.select(flat[0].id, flat);
      }
    });
  }

  select(id: number, flat?: Note[]): void {
    if (id === this.activeId()) return;

    // Persiste les modifications en cours sur la page qu'on quitte avant de basculer.
    this.flushSave();

    const note = (flat ?? this.flatNotes()).find((n) => n.id === id);
    if (!note) return;

    this.activeId.set(id);
    this.title.set(note.title);
    this.content.set(note.content ?? '');
    this.deleteError.set(null);
    this.saveStatus.set('idle');
    // Une page déjà rédigée s'ouvre en lecture ; une page vide s'ouvre prête à écrire.
    this.viewMode.set(note.content?.trim() ? 'preview' : 'edit');
  }

  setViewMode(mode: 'edit' | 'preview'): void {
    this.viewMode.set(mode);
  }

  onTitleChange(value: string): void {
    this.title.set(value);
    this.scheduleAutosave();
  }

  onContentChange(value: string): void {
    this.content.set(value);
    this.scheduleAutosave();
  }

  /** Ctrl/Cmd+S force l'enregistrement immédiat plutôt que d'attendre le délai d'autosave. */
  onEditorKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.flushSave();
    }
  }

  private scheduleAutosave(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.flushSave(), AUTOSAVE_DELAY_MS);
  }

  private flushSave(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    const note = this.activeNote();
    if (!note) return;

    const title = this.title().trim() || 'Sans titre';
    const content = this.content() || null;
    if (title === note.title && content === (note.content ?? null)) return;

    this.saveStatus.set('saving');
    this.noteService.update(note.id, { title, content }).subscribe({
      next: (updated) => {
        this.saveStatus.set('saved');
        this.patchNote(updated);
      },
      error: () => this.saveStatus.set('idle'),
    });
  }

  /** Met à jour l'arbre local sans tout recharger, pour ne pas faire clignoter la sidebar pendant la frappe. */
  private patchNote(updated: Note): void {
    this.notes.update((list) =>
      list.map((root) => {
        if (root.id === updated.id) return { ...root, ...updated, children: root.children };
        if (root.children.some((c) => c.id === updated.id)) {
          return { ...root, children: root.children.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) };
        }
        return root;
      }),
    );
  }

  private focusTitleForRename(): void {
    setTimeout(() => {
      const el = this.titleInput()?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }

  /** Style Notion : une nouvelle page est créée immédiatement ("Sans titre"), pas de formulaire à remplir avant. */
  createRootPage(): void {
    this.flushSave();
    this.noteService.create({ title: 'Sans titre', content: '' }).subscribe((note) => {
      this.notes.update((list) => [...list, { ...note, children: [] }].sort((a, b) => a.title.localeCompare(b.title)));
      this.select(note.id);
      this.focusTitleForRename();
    });
  }

  createChildPage(parentId?: number): void {
    const parent = parentId !== undefined ? this.flatNotes().find((n) => n.id === parentId) : this.activeNote();
    if (!parent) return;

    this.flushSave();
    this.noteService.create({ title: 'Sans titre', content: '', parent_id: parent.id }).subscribe((note) => {
      this.notes.update((list) =>
        list.map((root) =>
          root.id === parent.id
            ? { ...root, children: [...root.children, note].sort((a, b) => a.title.localeCompare(b.title)) }
            : root,
        ),
      );
      this.select(note.id);
      this.focusTitleForRename();
    });
  }

  /** Raccourci depuis la sidebar (icône "+" au survol d'une page racine) — évite d'avoir à l'ouvrir d'abord. */
  quickAddChild(parent: Note, event: Event): void {
    event.stopPropagation();
    this.createChildPage(parent.id);
  }

  confirmDelete(note: Note, event: Event): void {
    event.stopPropagation();
    this.deleteError.set(null);
    this.pendingDelete.set(note);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const note = this.pendingDelete();
    if (!note) return;

    this.noteService.delete(note.id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        if (this.activeId() === note.id) this.activeId.set(null);
        this.loadNotes();
      },
      error: () => {
        this.pendingDelete.set(null);
        this.deleteError.set('Cette page a des sous-pages : supprimez-les d\'abord.');
      },
    });
  }

  // ---------- Barre d'outils markdown ----------
  // Manipule directement la sélection du textarea (start/end) plutôt que de passer par le
  // binding, pour pouvoir repositionner le curseur après l'insertion.

  private focusAndSelect(start: number, end: number): void {
    const el = this.textarea()?.nativeElement;
    if (!el) return;
    el.focus();
    setTimeout(() => el.setSelectionRange(start, end));
  }

  private setContent(value: string): void {
    this.content.set(value);
    this.scheduleAutosave();
  }

  /** Entoure la sélection de `before`/`after` (ex. gras, italique, code) ; insère un texte de remplissage si rien n'est sélectionné. */
  wrapSelection(before: string, after: string = before, placeholder = 'texte'): void {
    const el = this.textarea()?.nativeElement;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = this.content();
    const selected = value.slice(start, end) || placeholder;

    this.setContent(value.slice(0, start) + before + selected + after + value.slice(end));
    this.focusAndSelect(start + before.length, start + before.length + selected.length);
  }

  /** Ajoute `prefix` en début de chaque ligne touchée par la sélection (titre, liste, citation). */
  prefixLines(prefix: string): void {
    const el = this.textarea()?.nativeElement;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = this.content();

    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = value.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;

    const block = value.slice(lineStart, lineEnd);
    const prefixed = block
      .split('\n')
      .map((line) => (line.startsWith(prefix) ? line : prefix + line))
      .join('\n');

    this.setContent(value.slice(0, lineStart) + prefixed + value.slice(lineEnd));
    this.focusAndSelect(lineStart, lineStart + prefixed.length);
  }

  insertLink(): void {
    const el = this.textarea()?.nativeElement;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = this.content();
    const label = value.slice(start, end) || 'texte du lien';
    const insertion = `[${label}](url)`;

    this.setContent(value.slice(0, start) + insertion + value.slice(end));
    // Sélectionne "url" pour que la frappe suivante la remplace directement.
    this.focusAndSelect(start + label.length + 3, start + insertion.length - 1);
  }

  /** Insère un tableau markdown (GFM) de base — rendu par `marked` sans configuration supplémentaire. */
  insertTable(): void {
    const el = this.textarea()?.nativeElement;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = this.content();

    const table = [
      '| Colonne 1 | Colonne 2 | Colonne 3 |',
      '| --- | --- | --- |',
      '| Valeur | Valeur | Valeur |',
    ].join('\n');

    // Un tableau doit démarrer sur sa propre ligne, précédée d'une ligne vide.
    const needsLeadingBreak = start > 0 && value[start - 1] !== '\n';
    const prefix = needsLeadingBreak ? '\n\n' : '';
    const insertion = prefix + table + '\n';

    this.setContent(value.slice(0, start) + insertion + value.slice(end));

    const tableStart = start + prefix.length;
    this.focusAndSelect(tableStart, tableStart + table.length);
  }
}
