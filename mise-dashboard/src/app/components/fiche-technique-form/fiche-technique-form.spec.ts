import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { FicheTechniqueForm } from './fiche-technique-form';
import { environment } from '../../../environments/environment';

describe('FicheTechniqueForm', () => {
  let component: FicheTechniqueForm;
  let fixture: ComponentFixture<FicheTechniqueForm>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FicheTechniqueForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FicheTechniqueForm);
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
});
