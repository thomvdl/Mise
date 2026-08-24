import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { Labels } from './labels';
import { environment } from '../../../environments/environment';

function isoDateWithOffset(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

describe('Labels', () => {
  let component: Labels;
  let fixture: ComponentFixture<Labels>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Labels],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Labels);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/ingredients`).flush([
      { id: 1, name: 'Beurre', slug: 'beurre', unit: 'kg', price: null, ingredient_category_id: null },
      { id: 2, name: 'Crème fraîche', slug: 'creme-fraiche', unit: 'L', price: null, ingredient_category_id: null },
    ]);
    httpMock.expectOne(`${environment.apiUrl}/fiche-techniques`).flush([
      { id: 1, name: 'Crêpes sucrées', slug: 'crepes-sucrees', category_id: null, station_id: null, servings: 8, difficulty: 1, description: null, equipment: null, mise_en_place: null, plating: null, chef_tip: null, haccp: null, conservation: null },
    ]);

    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('offers five label types, including "Jeter le"', () => {
    expect(component.labelTypes.map((t) => t.key)).toEqual(['ouvert', 'produit', 'congele', 'decongele', 'jeter']);
  });

  it('defaults to the first label type ("Ouvert le") and today\'s date', () => {
    expect(component.selectedType().key).toBe('ouvert');
    expect(component.date()).toBe(isoDateWithOffset(0));
  });

  it('switches the selected label type', () => {
    component.selectType(component.labelTypes[4]);
    expect(component.selectedType().key).toBe('jeter');
  });

  it('formats the ISO date as DD/MM/YYYY', () => {
    component.date.set('2026-07-16');
    expect(component.formattedDate()).toBe('16/07/2026');
  });

  it('merges and sorts ingredient and fiche technique names for suggestions', () => {
    expect(component.suggestions()).toEqual(['Beurre', 'Crème fraîche', 'Crêpes sucrées']);
  });

  it('disables "Ajouter à la liste" until a product name is entered', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-btn');
    expect(button.disabled).toBe(true);

    component.productName.set('Sauce béarnaise');
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });

  it('truncates the product name to 55 characters, spaces included', () => {
    const longName = 'A'.repeat(60);
    component.onNameInput({ target: { value: longName } } as unknown as Event);

    expect(component.productName()).toHaveLength(55);
    expect(component.productName()).toBe('A'.repeat(55));
  });

  it('exposes the max length for the template counter and the input\'s maxlength attribute', () => {
    expect(component.productNameMaxLength).toBe(55);

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#product-name');
    expect(input.maxLength).toBe(55);
  });

  it('reflects the chosen type and date in the label preview', () => {
    component.selectType(component.labelTypes[3]);
    component.productName.set('Fond de veau');
    component.date.set('2026-07-16');
    fixture.detectChanges();

    const label: HTMLElement = fixture.nativeElement.querySelector('.preview-wrap .label-page');
    expect(label.getAttribute('data-type')).toBe('decongele');
    expect(label.querySelector('.label-name')?.textContent).toContain('Fond de veau');
    expect(label.querySelector('.label-type')?.textContent).toContain('Décongelé le');
    expect(label.querySelector('.label-date')?.textContent).toContain('16/07/2026');
  });

  describe('quick date offsets (now on the DLC field)', () => {
    it('offers six quick choices: today through J+5', () => {
      expect(component.dateOffsets).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('sets the DLC to today+N when a J+n chip is clicked', () => {
      component.setUseByDateOffset(3);
      expect(component.useByDate()).toBe(isoDateWithOffset(3));
    });

    it('reports which offset (if any) matches the current DLC', () => {
      component.setUseByDateOffset(2);
      expect(component.isUseByDateOffsetActive(2)).toBe(true);
      expect(component.isUseByDateOffsetActive(0)).toBe(false);
      expect(component.isUseByDateOffsetActive(5)).toBe(false);
    });

    it('does not expose any quick-offset affordance for the main Date field', () => {
      expect((component as unknown as Record<string, unknown>)['setDateOffset']).toBeUndefined();
      expect((component as unknown as Record<string, unknown>)['isDateOffsetActive']).toBeUndefined();
    });
  });

  describe('DLC (use-by date)', () => {
    it('has no DLC by default ("Ouvert le" carries no default shelf life)', () => {
      expect(component.selectedType().key).toBe('ouvert');
      expect(component.useByDate()).toBe('');
    });

    it('seeds the DLC from the selected type\'s default when switching type', () => {
      component.selectType(component.labelTypes[3]); // "Décongelé le" → 2 days
      expect(component.useByDate()).toBe(isoDateWithOffset(2));

      component.selectType(component.labelTypes[2]); // "Congelé le" → no default
      expect(component.useByDate()).toBe('');
    });

    it('sets the DLC directly via the date input', () => {
      component.onUseByDateInput({ target: { value: '2026-07-20' } } as unknown as Event);
      expect(component.useByDate()).toBe('2026-07-20');
      expect(component.formattedUseByDate()).toBe('20/07/2026');
    });

    it('shows the DLC in the preview, at the same size as the main date, when set', () => {
      component.onUseByDateInput({ target: { value: '2026-07-20' } } as unknown as Event);
      fixture.detectChanges();

      const label: HTMLElement = fixture.nativeElement.querySelector('.preview-wrap .label-page');
      const mainDate = label.querySelector('.label-date:not(.label-use-by)') as HTMLElement;
      const dlcDate = label.querySelector('.label-date.label-use-by') as HTMLElement;

      expect(dlcDate?.textContent).toContain('20/07/2026');
      expect(dlcDate.classList.contains('label-date')).toBe(true);
      expect(mainDate.classList.contains('label-date')).toBe(true);
    });

    it('omits the DLC lines in the preview when unset', () => {
      component.onUseByDateInput({ target: { value: '' } } as unknown as Event);
      fixture.detectChanges();

      const label: HTMLElement = fixture.nativeElement.querySelector('.preview-wrap .label-page');
      expect(label.querySelector('.label-use-by')).toBeNull();
    });
  });

  describe('print queue', () => {
    it('adds the composed label to the queue and clears the product name for the next one', () => {
      component.selectType(component.labelTypes[2]); // "Congelé le" → no DLC
      component.date.set('2026-07-16');
      component.productName.set('Fraises');

      component.addToQueue();

      expect(component.queue()).toEqual([
        {
          id: 0,
          type: component.labelTypes[2],
          productName: 'Fraises',
          date: '2026-07-16',
          useByDate: null,
          quantity: 1,
          madeBy: '',
        },
      ]);
      expect(component.productName()).toBe('');
    });

    it('captures the computed DLC on the queued label', () => {
      component.selectType(component.labelTypes[3]); // 2-day default
      component.date.set('2026-07-16');
      component.productName.set('Fond de veau');

      component.addToQueue();

      expect(component.queue()[0].useByDate).toBe(isoDateWithOffset(2));
    });

    it('does nothing when the product name is blank', () => {
      component.productName.set('   ');
      component.addToQueue();
      expect(component.queue()).toEqual([]);
    });

    it('keeps the selected type and date across additions, only clearing the name', () => {
      component.selectType(component.labelTypes[0]);
      component.date.set('2026-07-16');

      component.productName.set('Beurre');
      component.addToQueue();
      component.productName.set('Crème fraîche');
      component.addToQueue();

      expect(component.queue().map((item) => item.productName)).toEqual(['Beurre', 'Crème fraîche']);
      expect(component.queue().every((item) => item.type.key === 'ouvert' && item.date === '2026-07-16')).toBe(true);
    });

    it('removes a single queued label by id', () => {
      component.productName.set('Beurre');
      component.addToQueue();
      component.productName.set('Lait');
      component.addToQueue();

      const [first] = component.queue();
      component.removeFromQueue(first.id);

      expect(component.queue().map((item) => item.productName)).toEqual(['Lait']);
    });

    it('clears the whole queue', () => {
      component.productName.set('Beurre');
      component.addToQueue();
      component.clearQueue();
      expect(component.queue()).toEqual([]);
    });
  });
});

describe('Labels — arriving from a fiche technique ("Imprimer une étiquette")', () => {
  let component: Labels;
  let fixture: ComponentFixture<Labels>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Labels],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ produit: 'Crêpes sucrées' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Labels);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/ingredients`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/fiche-techniques`).flush([]);

    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('prefills the product name from the "produit" query param', () => {
    expect(component.productName()).toBe('Crêpes sucrées');
  });

  it('defaults the type to "Produit le" rather than the first type in the list', () => {
    expect(component.selectedType().key).toBe('produit');
  });

  it('seeds the DLC from "Produit le"\'s own default (3 days)', () => {
    expect(component.useByDate()).toBe(isoDateWithOffset(3));
  });
});
