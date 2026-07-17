import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Menus } from './menus';
import { environment } from '../../../environments/environment';
import { Menu } from '../../core/models/menu.model';

const MENUS: Menu[] = [
  { id: 1, name: 'Menu ancien', slug: 'menu-ancien', description: null, starts_at: null, ends_at: null, created_at: '2026-01-01T00:00:00.000000Z' },
  { id: 2, name: 'Menu récent', slug: 'menu-recent', description: null, starts_at: null, ends_at: null, created_at: '2026-07-01T00:00:00.000000Z' },
  { id: 3, name: 'Menu intermédiaire', slug: 'menu-intermediaire', description: null, starts_at: null, ends_at: null, created_at: '2026-04-01T00:00:00.000000Z' },
];

describe('Menus', () => {
  let component: Menus;
  let fixture: ComponentFixture<Menus>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Menus],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Menus);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/menus`).flush(MENUS);

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sorts menus by creation date, most recent first', () => {
    expect(component.sortedMenus().map((menu) => menu.id)).toEqual([2, 3, 1]);
  });

  it('auto-selects the most recently created menu', () => {
    expect(component.selectedId()).toBe(2);
    expect(component.selectedMenu()?.id).toBe(2);
  });
});
