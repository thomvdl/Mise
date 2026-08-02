import { Routes } from '@angular/router';

import {
  allergenConfig,
  categoryConfig,
  ingredientCategoryConfig,
  stationConfig,
} from './core/config/simple-entity.config';
import { adminGuard } from './core/guards/admin.guard';

function simpleEntityRoutes(path: string, config: typeof categoryConfig): Routes[number] {
  return {
    path,
    children: [
      {
        path: '',
        loadComponent: () => import('./components/simple-entity/simple-entity-list').then((m) => m.SimpleEntityList),
        data: { config },
      },
      {
        path: 'nouveau',
        loadComponent: () => import('./components/simple-entity/simple-entity-form').then((m) => m.SimpleEntityForm),
        data: { config },
      },
      {
        path: ':id',
        loadComponent: () => import('./components/simple-entity/simple-entity-form').then((m) => m.SimpleEntityForm),
        data: { config },
      },
    ],
  };
}

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },

  {
    path: '',
    canActivate: [adminGuard],
    children: [
      { path: '', loadComponent: () => import('./components/home/home').then((m) => m.Home) },

      {
        path: 'fiche-techniques',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/fiche-technique-list/fiche-technique-list').then((m) => m.FicheTechniqueList),
          },
          {
            path: 'nouveau',
            loadComponent: () =>
              import('./components/fiche-technique-form/fiche-technique-form').then((m) => m.FicheTechniqueForm),
          },
          {
            path: ':id/imprimer',
            loadComponent: () =>
              import('./components/fiche-technique-print/fiche-technique-print').then((m) => m.FicheTechniquePrint),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./components/fiche-technique-form/fiche-technique-form').then((m) => m.FicheTechniqueForm),
          },
        ],
      },

      {
        path: 'import',
        loadComponent: () =>
          import('./components/fiche-technique-import/fiche-technique-import').then((m) => m.FicheTechniqueImport),
      },

      {
        path: 'menus',
        children: [
          {
            path: '',
            loadComponent: () => import('./components/menu-list/menu-list').then((m) => m.MenuList),
          },
          {
            path: 'nouveau',
            loadComponent: () => import('./components/menu-form/menu-form').then((m) => m.MenuForm),
          },
          {
            path: 'import',
            loadComponent: () => import('./components/menu-import/menu-import').then((m) => m.MenuImport),
          },
          {
            path: ':id/imprimer',
            loadComponent: () => import('./components/menu-print/menu-print').then((m) => m.MenuPrint),
          },
          {
            path: ':id/liste-courses',
            loadComponent: () =>
              import('./components/menu-shopping-list/menu-shopping-list').then((m) => m.MenuShoppingList),
          },
          {
            path: ':id',
            loadComponent: () => import('./components/menu-form/menu-form').then((m) => m.MenuForm),
          },
        ],
      },

      {
        path: 'ingredients',
        children: [
          {
            path: '',
            loadComponent: () => import('./components/ingredient-list/ingredient-list').then((m) => m.IngredientList),
          },
          {
            path: 'nouveau',
            loadComponent: () => import('./components/ingredient-form/ingredient-form').then((m) => m.IngredientForm),
          },
          {
            path: ':id',
            loadComponent: () => import('./components/ingredient-form/ingredient-form').then((m) => m.IngredientForm),
          },
        ],
      },

      simpleEntityRoutes('categories', categoryConfig),
      simpleEntityRoutes('stations', stationConfig),
      simpleEntityRoutes('allergenes', allergenConfig),
      simpleEntityRoutes('categories-ingredients', ingredientCategoryConfig),

      {
        path: 'photos',
        loadComponent: () => import('./components/photo-list/photo-list').then((m) => m.PhotoList),
      },

      {
        path: 'appareils',
        children: [
          {
            path: '',
            loadComponent: () => import('./components/appareil-list/appareil-list').then((m) => m.AppareilList),
          },
          {
            path: 'nouveau',
            loadComponent: () => import('./components/appareil-form/appareil-form').then((m) => m.AppareilForm),
          },
          {
            path: ':id',
            loadComponent: () => import('./components/appareil-form/appareil-form').then((m) => m.AppareilForm),
          },
        ],
      },

      {
        path: 'temperatures',
        loadComponent: () =>
          import('./components/temperature-report/temperature-report').then((m) => m.TemperatureReport),
      },

      {
        path: 'friteuses',
        children: [
          {
            path: '',
            loadComponent: () => import('./components/friteuse-list/friteuse-list').then((m) => m.FriteuseList),
          },
          {
            path: 'nouveau',
            loadComponent: () => import('./components/friteuse-form/friteuse-form').then((m) => m.FriteuseForm),
          },
          {
            path: ':id',
            loadComponent: () => import('./components/friteuse-form/friteuse-form').then((m) => m.FriteuseForm),
          },
        ],
      },

      {
        path: 'huile',
        loadComponent: () => import('./components/huile-report/huile-report').then((m) => m.HuileReport),
      },

      {
        path: 'etiquettes',
        loadComponent: () =>
          import('./components/printed-label-report/printed-label-report').then((m) => m.PrintedLabelReport),
      },

      {
        path: 'discussion',
        loadComponent: () => import('./components/discussion/discussion').then((m) => m.Discussion),
      },

      {
        path: 'courses',
        loadComponent: () => import('./components/shopping-list/shopping-list').then((m) => m.ShoppingList),
      },

      {
        path: 'calendrier',
        loadComponent: () => import('./components/event-calendar/event-calendar').then((m) => m.EventCalendar),
      },

      {
        path: 'parametres',
        loadComponent: () => import('./components/parametres/parametres').then((m) => m.Parametres),
      },

      {
        path: 'utilisateurs',
        children: [
          {
            path: '',
            loadComponent: () => import('./components/user-list/user-list').then((m) => m.UserList),
          },
          {
            path: 'nouveau',
            loadComponent: () => import('./components/user-form/user-form').then((m) => m.UserForm),
          },
          {
            path: ':id',
            loadComponent: () => import('./components/user-form/user-form').then((m) => m.UserForm),
          },
        ],
      },

      { path: '**', redirectTo: '' },
    ],
  },
];
