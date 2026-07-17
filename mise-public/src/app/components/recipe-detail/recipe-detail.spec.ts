import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RecipeDetail } from './recipe-detail';
import { FicheTechnique } from '../../core/models/fiche-technique.model';

function makeFiche(overrides: Partial<FicheTechnique> = {}): FicheTechnique {
  return {
    id: 1,
    name: 'Crêpes sucrées',
    slug: 'crepes-sucrees',
    category_id: null,
    station_id: null,
    servings: 8,
    difficulty: 1,
    description: null,
    equipment: null,
    mise_en_place: null,
    plating: null,
    chef_tip: null,
    haccp: null,
    conservation: null,
    ...overrides,
  };
}

describe('RecipeDetail', () => {
  let component: RecipeDetail;
  let fixture: ComponentFixture<RecipeDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeDetail],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('clamps the servings counter between 1 and 100', () => {
    component.servings.set(1);
    component.adjustServings(-1);
    expect(component.servings()).toBe(1);

    component.servings.set(100);
    component.adjustServings(1);
    expect(component.servings()).toBe(100);
  });

  it('links to the label printer, pre-filling the product name with the fiche\'s name', () => {
    fixture.componentRef.setInput('fiche', makeFiche({ name: 'Crêpes sucrées' }));
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.print-label-link');
    expect(link).not.toBeNull();
    expect(link.textContent).toContain('Imprimer une étiquette');
    expect(link.getAttribute('href')).toBe('/etiquettes?produit=Cr%C3%AApes%20sucr%C3%A9es');
  });
});
