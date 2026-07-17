import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { FicheTechniqueImport } from './fiche-technique-import';
import { environment } from '../../../environments/environment';

describe('FicheTechniqueImport', () => {
  let component: FicheTechniqueImport;
  let fixture: ComponentFixture<FicheTechniqueImport>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FicheTechniqueImport],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FicheTechniqueImport);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/categories`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/stations`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/ingredients`).flush([]);

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('parses the pre-filled example text (two fiches) into a preview', () => {
    const resolved = component.resolved();
    expect(resolved).toHaveLength(2);
    expect(resolved[0].block.error).toBeNull();
    expect(resolved[0].block.value?.name).toBe('Crêpes sucrées');
    expect(resolved[1].block.value?.name).toBe('Pain perdu');
    expect(component.validCount()).toBe(2);
    // "Oeufs" and "Lait entier" are shared by both fiches and should only be counted once.
    expect(component.newIngredients().length).toBe(5);
  });
});
