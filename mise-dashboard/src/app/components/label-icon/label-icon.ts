import { Component, input } from '@angular/core';

/**
 * Petite icône par type d'étiquette, en SVG inline — même jeu de clés que côté impression
 * (ZplIconRenderer/LabelTypeController::ICON_KEYS côté API), juste redessiné en vecteur plutôt
 * qu'en bitmap GD. Les deux doivent rester visuellement cohérents si on change un dessin.
 */
@Component({
  selector: 'app-label-icon',
  templateUrl: './label-icon.html',
  styleUrl: './label-icon.css',
})
export class LabelIcon {
  icon = input<string | null | undefined>(null);
}
