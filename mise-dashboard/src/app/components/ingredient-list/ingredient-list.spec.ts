import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { IngredientList } from './ingredient-list';
import { environment } from '../../../environments/environment';

describe('IngredientList', () => {
  let component: IngredientList;
  let fixture: ComponentFixture<IngredientList>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(IngredientList);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/ingredients`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/ingredient-categories`).flush([]);

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('IngredientList — default sort order', () => {
  let component: IngredientList;
  let fixture: ComponentFixture<IngredientList>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(IngredientList);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/ingredients`).flush([
      { id: 1, name: 'Sel fin', slug: 'sel-fin', unit: 'kg', price: null, ingredient_category_id: null, category: { id: 9, name: 'Condiments & épices', slug: 'condiments-epices', color: null } },
      { id: 2, name: 'Amandes effilées', slug: 'amandes', unit: 'kg', price: null, ingredient_category_id: null, category: { id: 4, name: 'Fruits secs & oléagineux', slug: 'fruits-secs', color: null } },
      { id: 3, name: 'Œufs', slug: 'oeufs', unit: 'pièce', price: null, ingredient_category_id: null, category: { id: 3, name: 'Œufs', slug: 'oeufs', color: null } },
      { id: 4, name: 'Beurre', slug: 'beurre', unit: 'kg', price: null, ingredient_category_id: null, category: { id: 2, name: 'Produits laitiers', slug: 'produits-laitiers', color: null } },
      { id: 5, name: 'Farine de blé', slug: 'farine', unit: 'kg', price: null, ingredient_category_id: null, category: { id: 1, name: 'Céréales & farines', slug: 'cereales-farines', color: null } },
      { id: 6, name: 'Article sans catégorie', slug: 'sans-categorie', unit: 'kg', price: null, ingredient_category_id: null, category: null },
    ]);
    httpMock.expectOne(`${environment.apiUrl}/ingredient-categories`).flush([
      { id: 1, name: 'Céréales & farines', slug: 'cereales-farines', color: null },
      { id: 2, name: 'Produits laitiers', slug: 'produits-laitiers', color: null },
      { id: 3, name: 'Œufs', slug: 'oeufs', color: null },
      { id: 4, name: 'Fruits secs & oléagineux', slug: 'fruits-secs', color: null },
      { id: 9, name: 'Condiments & épices', slug: 'condiments-epices', color: null },
    ]);

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sorts by category name (A→Z), then by ingredient name (A→Z), uncategorized last, before any column is clicked', () => {
    expect(component.filtered().map((i) => [i.category?.name ?? null, i.name])).toEqual([
      ['Céréales & farines', 'Farine de blé'],
      ['Condiments & épices', 'Sel fin'],
      ['Fruits secs & oléagineux', 'Amandes effilées'],
      ['Œufs', 'Œufs'],
      ['Produits laitiers', 'Beurre'],
      [null, 'Article sans catégorie'],
    ]);
  });

  it('still lets column clicks sort by a single field', () => {
    component.setSort('name');
    expect(component.filtered().map((i) => i.name)).toEqual([
      'Amandes effilées',
      'Article sans catégorie',
      'Beurre',
      'Farine de blé',
      'Œufs',
      'Sel fin',
    ]);
  });

  it('filters by the selected category', () => {
    component.onCategoryChange({ target: { value: '2' } } as unknown as Event);
    expect(component.filtered().map((i) => i.name)).toEqual(['Beurre']);
  });

  it('combines the search text with the selected category', () => {
    component.search.set('œufs');
    component.onCategoryChange({ target: { value: '3' } } as unknown as Event);
    expect(component.filtered().map((i) => i.name)).toEqual(['Œufs']);

    component.onCategoryChange({ target: { value: '2' } } as unknown as Event);
    expect(component.filtered()).toEqual([]);
  });

  it('resets to all categories when the empty option is chosen', () => {
    component.onCategoryChange({ target: { value: '2' } } as unknown as Event);
    expect(component.filtered().length).toBe(1);

    component.onCategoryChange({ target: { value: '' } } as unknown as Event);
    expect(component.filtered().length).toBe(6);
  });
});
