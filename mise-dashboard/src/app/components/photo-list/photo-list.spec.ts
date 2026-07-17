import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PhotoList } from './photo-list';
import { environment } from '../../../environments/environment';

describe('PhotoList', () => {
  let component: PhotoList;
  let fixture: ComponentFixture<PhotoList>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoList);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/pictures`).flush([
      { id: 1, url: 'http://localhost:8000/storage/pictures/a.jpg', fiche_technique: null },
    ]);
    httpMock.expectOne(`${environment.apiUrl}/fiche-techniques`).flush([]);

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the picture library', () => {
    expect(component.pictures()).toHaveLength(1);
    expect(component.pictures()[0].fiche_technique).toBeNull();
  });

  it('links a picture to a fiche technique', () => {
    component.onLinkChange(component.pictures()[0], { target: { value: '7' } } as unknown as Event);

    const req = httpMock.expectOne(`${environment.apiUrl}/pictures/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ fiche_technique_id: 7 });
    req.flush({ id: 1, url: 'http://localhost:8000/storage/pictures/a.jpg', fiche_technique: { id: 7, name: 'Test', slug: 'test' } });

    expect(component.pictures()[0].fiche_technique?.id).toBe(7);
  });
});

describe('PhotoList — dropdown selection when the catalog resolves after the pictures', () => {
  let fixture: ComponentFixture<PhotoList>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoList);
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    // Pictures resolve first, already linked to fiche technique 7 — before the fiche
    // technique catalog (used to populate the <option> list) has loaded. A plain
    // [value] binding on the <select> only applies once and misses options added
    // afterward, so this reproduces the reported bug.
    httpMock
      .expectOne(`${environment.apiUrl}/pictures`)
      .flush([
        {
          id: 1,
          url: 'http://localhost:8000/storage/pictures/a.jpg',
          fiche_technique: { id: 7, name: 'Pain perdu', slug: 'pain-perdu' },
        },
      ]);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/fiche-techniques`).flush([
      { id: 7, name: 'Pain perdu', slug: 'pain-perdu' },
    ] as unknown as never[]);

    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows the already-linked fiche technique as the selected option', () => {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select.form-select');
    expect(select.value).toBe('7');
    expect(select.selectedOptions[0].textContent?.trim()).toBe('Pain perdu');
  });
});
