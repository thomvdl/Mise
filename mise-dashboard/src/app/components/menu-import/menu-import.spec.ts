import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MenuImport } from './menu-import';
import { environment } from '../../../environments/environment';

describe('MenuImport', () => {
  let component: MenuImport;
  let fixture: ComponentFixture<MenuImport>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuImport],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuImport);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/fiche-techniques`).flush([]);

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('parses the pre-filled example text (two menus) into a preview', () => {
    const resolved = component.resolved();
    expect(resolved).toHaveLength(2);
    expect(resolved[0].block.error).toBeNull();
    expect(resolved[0].block.value?.name).toBe('Menu du dimanche');
    expect(resolved[1].block.value?.name).toBe('Menu de semaine');
    expect(component.validCount()).toBe(2);
    // No fiche technique exists in the mocked catalog, so every referenced name is unmatched.
    expect(resolved[0].sections[1].plats[0].fiches[0].matched).toBeNull();
  });
});
