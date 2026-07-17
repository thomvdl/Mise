import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface SettingsLink {
  label: string;
  description: string;
  path: string;
}

@Component({
  selector: 'app-parametres',
  imports: [RouterLink],
  templateUrl: './parametres.html',
  styleUrl: './parametres.css',
})
export class Parametres {
  readonly links: SettingsLink[] = [
    { label: 'Catégories', description: 'Catégories des fiches techniques', path: '/categories' },
    { label: 'Stations', description: 'Stations de cuisine', path: '/stations' },
    { label: 'Allergènes', description: 'Liste des allergènes', path: '/allergenes' },
    { label: 'Appareils', description: 'Frigos, chambres froides, congélateurs…', path: '/appareils' },
    { label: 'Friteuses', description: 'Friteuses et durée de vie de l\'huile', path: '/friteuses' },
  ];
}
