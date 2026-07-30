import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { Labels } from './labels';
import { environment } from '../../../environments/environment';
import { BrotherQlPrinterService } from '../../core/services/brother-ql-printer.service';
import { QueuedLabel } from '../../core/models/label.model';

class FakeBrotherQlPrinterService {
  supported = true;
  print = vi.fn((_labels: QueuedLabel[]) => Promise.resolve());

  isSupported(): boolean {
    return this.supported;
  }
}

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
  let fakePrinter: FakeBrotherQlPrinterService;

  beforeEach(async () => {
    fakePrinter = new FakeBrotherQlPrinterService();

    await TestBed.configureTestingModule({
      imports: [Labels],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BrotherQlPrinterService, useValue: fakePrinter },
      ],
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
    expect(label.querySelector('.label-type')?.textContent).toContain('Décongelé, jeter le');
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
      component.selectType(component.labelTypes[3]); // "Décongelé, jeter le" → 2 days
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

    it('renders one printable label per queued item, in the print-only batch', () => {
      component.selectType(component.labelTypes[4]);
      component.date.set('2026-07-16');
      component.productName.set('Restes de risotto');
      component.addToQueue();
      fixture.detectChanges();

      const batchLabels: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.print-batch .label-page');
      expect(batchLabels.length).toBe(1);
      expect(batchLabels[0].getAttribute('data-type')).toBe('jeter');
      expect(batchLabels[0].querySelector('.label-name')?.textContent).toContain('Restes de risotto');
      expect(batchLabels[0].querySelector('.label-date')?.textContent).toContain('16/07/2026');
    });

    it('renders the DLC in the print-only batch when the queued label has one', () => {
      component.selectType(component.labelTypes[3]); // 2-day default
      component.date.set('2026-07-16');
      component.productName.set('Fond de veau');
      component.addToQueue();
      fixture.detectChanges();

      const batchLabel: HTMLElement = fixture.nativeElement.querySelector('.print-batch .label-page');
      expect(batchLabel.querySelector('.label-use-by')?.textContent).toContain(component.formatDate(isoDateWithOffset(2)));
    });

    it('does not open the print dialog when the queue is empty', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      component.printQueue();
      expect(printSpy).not.toHaveBeenCalled();
    });

    it('opens the print dialog when the queue has at least one label', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      component.productName.set('Beurre');
      component.addToQueue();
      component.printQueue();
      expect(printSpy).toHaveBeenCalled();
    });
  });

  describe('direct printing on a Brother QL printer', () => {
    it('does nothing when the queue is empty', async () => {
      await component.printQueueOnBrotherQl();
      expect(fakePrinter.print).not.toHaveBeenCalled();
    });

    it('sends the whole queue to the printer, and toggles the busy state', async () => {
      component.productName.set('Beurre');
      component.addToQueue();
      component.productName.set('Lait');
      component.addToQueue();

      const printPromise = component.printQueueOnBrotherQl();
      expect(component.printingOnBrotherQl()).toBe(true);

      await printPromise;

      expect(fakePrinter.print).toHaveBeenCalledWith(component.queue());
      expect(component.printingOnBrotherQl()).toBe(false);
      expect(component.brotherQlError()).toBeNull();
    });

    it('surfaces the error message when printing fails', async () => {
      fakePrinter.print.mockRejectedValueOnce(new Error('Aucune imprimante sélectionnée.'));

      component.productName.set('Beurre');
      component.addToQueue();
      await component.printQueueOnBrotherQl();

      expect(component.brotherQlError()).toBe('Aucune imprimante sélectionnée.');
      expect(component.printingOnBrotherQl()).toBe(false);
    });

    it('enables the Brother QL button when the service reports WebUSB support', () => {
      component.productName.set('Beurre');
      component.addToQueue();
      fixture.detectChanges();

      const button: HTMLButtonElement = fixture.nativeElement.querySelector('.brother-ql-btn');
      expect(button.disabled).toBe(false);
    });
  });
});

describe('Labels — WebUSB unsupported', () => {
  let component: Labels;
  let fixture: ComponentFixture<Labels>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    const unsupportedPrinter = new FakeBrotherQlPrinterService();
    unsupportedPrinter.supported = false;

    await TestBed.configureTestingModule({
      imports: [Labels],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BrotherQlPrinterService, useValue: unsupportedPrinter },
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

  it('reports WebUSB as unsupported', () => {
    expect(component.brotherQlSupported).toBe(false);
  });

  it('disables the Brother QL button and shows the browser hint once a label is queued', () => {
    component.productName.set('Beurre');
    component.addToQueue();
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.brother-ql-btn');
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Chrome ou Edge');
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
        { provide: BrotherQlPrinterService, useValue: new FakeBrotherQlPrinterService() },
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
