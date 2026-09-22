import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

/**
 * Convertit du markdown en HTML sanitisé, prêt pour un binding [innerHTML] — le contenu vient
 * d'utilisateurs internes mais reste rendu tel quel dans le navigateur, DOMPurify évite qu'un
 * copier-coller malencontreux (balise <script>, event handler...) ne s'exécute.
 */
export function renderMarkdown(source: string | null | undefined): string {
  if (!source) return '';

  const html = marked.parse(source, { async: false }) as string;

  return DOMPurify.sanitize(html);
}
