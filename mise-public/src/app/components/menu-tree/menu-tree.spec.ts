import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MenuTree } from './menu-tree';
import { Menu } from '../../core/models/menu.model';
import { FicheTechnique } from '../../core/models/fiche-technique.model';

const FICHE = { id: 42, name: 'Bœuf sauce truffe' } as FicheTechnique;

const MENU: Menu = {
  id: 1,
  name: 'Menu dégustation',
  slug: 'menu-degustation',
  description: null,
  starts_at: null,
  ends_at: null,
  created_at: '2026-01-01T00:00:00.000000Z',
  sections: [
    {
      id: 1,
      menu_id: 1,
      name: 'Plats',
      position: 1,
      plats: [
        {
          id: 1,
          menu_section_id: 1,
          name: 'Bœuf',
          description: null,
          position: 1,
          fiche_techniques: [{ ...FICHE, pivot: { position: 1 } }],
        },
      ],
    },
  ],
};

describe('MenuTree', () => {
  let component: MenuTree;
  let fixture: ComponentFixture<MenuTree>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuTree],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuTree);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links each fiche technique chip to /fiches with its id as a query param', () => {
    fixture.componentRef.setInput('menu', MENU);
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.fiche-link');
    expect(link).toBeTruthy();
    expect(link.textContent?.trim()).toBe('Bœuf sauce truffe');
    expect(link.getAttribute('href')).toBe('/fiches?id=42');
  });
});
