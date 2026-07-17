import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
    {
        path: '',
        canActivate: [authGuard],
        children: [
            { path: '', loadComponent: () => import('./pages/accueil/accueil').then((m) => m.Accueil) },
            { path: 'fiches', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
            { path: 'menus', loadComponent: () => import('./pages/menus/menus').then((m) => m.Menus) },
            { path: 'ingredients', loadComponent: () => import('./pages/ingredients/ingredients').then((m) => m.Ingredients) },
            { path: 'etiquettes', loadComponent: () => import('./pages/labels/labels').then((m) => m.Labels) },
            { path: 'discussion', loadComponent: () => import('./pages/discussion/discussion').then((m) => m.Discussion) },
            { path: 'courses', loadComponent: () => import('./pages/courses/courses').then((m) => m.Courses) },
            { path: 'calendrier', loadComponent: () => import('./pages/calendrier/calendrier').then((m) => m.Calendrier) },
            { path: 'temperatures', loadComponent: () => import('./pages/temperatures/temperatures').then((m) => m.Temperatures) },
            { path: 'huile', loadComponent: () => import('./pages/huile/huile').then((m) => m.Huile) },
            { path: '**', redirectTo: '' },
        ],
    },
];
