import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeFilters } from './recipe-filters';

describe('RecipeFilters', () => {
  let component: RecipeFilters;
  let fixture: ComponentFixture<RecipeFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeFilters],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
