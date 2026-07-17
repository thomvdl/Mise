import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { Home } from './home';
import { environment } from '../../../environments/environment';
import { FicheTechnique } from '../../core/models/fiche-technique.model';

const FICHES = [
  { id: 5, name: 'Autre fiche' } as FicheTechnique,
  { id: 7, name: 'Fiche ciblée' } as FicheTechnique,
];

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // Simulates arriving via a "/fiches?id=7" link, e.g. from a menu's linked recipe.
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ id: '7' })) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/stations`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/fiche-techniques`).flush(FICHES);
    httpMock.expectOne(`${environment.apiUrl}/ingredients`).flush([]);

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('preselects the fiche technique named by the id query param', () => {
    expect(component.selectedId()).toBe(7);
    expect(component.selectedFiche()?.name).toBe('Fiche ciblée');
  });
});
