import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FicheTechniquePicker } from './fiche-technique-picker';
import { FicheTechnique } from '../../core/models/fiche-technique.model';

function makeFiche(id: number, name: string): FicheTechnique {
  return {
    id,
    name,
    slug: name.toLowerCase(),
    category_id: null,
    station_id: null,
    servings: 4,
    difficulty: 1,
    description: null,
    equipment: null,
    mise_en_place: null,
    plating: null,
    chef_tip: null,
    haccp: null,
    conservation: null,
  };
}

describe('FicheTechniquePicker', () => {
  let component: FicheTechniquePicker;
  let fixture: ComponentFixture<FicheTechniquePicker>;

  const items = [makeFiche(1, 'Crêpes sucrées'), makeFiche(2, 'Pain perdu'), makeFiche(3, 'Velouté de courge')];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FicheTechniquePicker],
    }).compileComponents();

    fixture = TestBed.createComponent(FicheTechniquePicker);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('selectedIds', [2]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows only the selected items as chips', () => {
    expect(component.selected()).toEqual([items[1]]);
  });

  it('filters the dropdown list by name, ignoring accents and case', () => {
    component.search.set('velout');
    expect(component.filtered()).toEqual([items[2]]);

    component.search.set('CREPES');
    expect(component.filtered()).toEqual([items[0]]);
  });

  it('emits toggle with the fiche id when selecting or removing', () => {
    const emitted: number[] = [];
    component.toggle.subscribe((id) => emitted.push(id));

    component.select(3);
    component.remove(2, new MouseEvent('click'));

    expect(emitted).toEqual([3, 2]);
  });

  it('opens the dropdown and resets the search on toggleOpen', () => {
    component.search.set('velout');
    component.toggleOpen();
    expect(component.open()).toBe(true);
    expect(component.search()).toBe('');
  });
});
