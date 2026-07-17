import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MenuForm } from './menu-form';
import { environment } from '../../../environments/environment';

describe('MenuForm', () => {
  let component: MenuForm;
  let fixture: ComponentFixture<MenuForm>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuForm);
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

  it('starts with one empty section containing one empty plat', () => {
    expect(component.sections.length).toBe(1);
    expect(component.sections.at(0).controls.plats.length).toBe(1);
  });

  it('toggles a fiche technique id on a plat', () => {
    component.toggleFicheTechnique(0, 0, 5);
    expect(component.isFicheTechniqueSelected(0, 0, 5)).toBe(true);

    component.toggleFicheTechnique(0, 0, 5);
    expect(component.isFicheTechniqueSelected(0, 0, 5)).toBe(false);
  });

  it('sets ends_at equal to starts_at for a one-shot menu', () => {
    component.form.patchValue({ name: 'Menu de Noël', slug: 'menu-de-noel', starts_at: '2026-12-24' });
    component.sections.at(0).controls.name.setValue('Plats');
    component.sections.at(0).controls.plats.at(0).controls.name.setValue('Bûche');
    component.oneShot.set(true);

    component.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/menus`);
    expect(req.request.body.starts_at).toBe('2026-12-24');
    expect(req.request.body.ends_at).toBe('2026-12-24');
    req.flush({});
  });

  it('keeps distinct starts_at/ends_at when not a one-shot menu', () => {
    component.form.patchValue({
      name: 'Menu été',
      slug: 'menu-ete',
      starts_at: '2026-07-01',
      ends_at: '2026-08-31',
    });
    component.sections.at(0).controls.name.setValue('Plats');
    component.sections.at(0).controls.plats.at(0).controls.name.setValue('Gaspacho');

    component.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/menus`);
    expect(req.request.body.starts_at).toBe('2026-07-01');
    expect(req.request.body.ends_at).toBe('2026-08-31');
    req.flush({});
  });
});
