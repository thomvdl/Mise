import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PhotoList } from './photo-list';
import { environment } from '../../../environments/environment';

describe('PhotoList', () => {
  let component: PhotoList;
  let fixture: ComponentFixture<PhotoList>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoList);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/pictures`).flush([
      { id: 1, url: 'http://localhost:8000/storage/pictures/a.jpg', fiche_technique: null },
      {
        id: 2,
        url: 'http://localhost:8000/storage/pictures/b.jpg',
        fiche_technique: { id: 7, name: 'Pain perdu', slug: 'pain-perdu' },
      },
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

  it('loads the full picture library but only shows pictures linked to a fiche technique', () => {
    expect(component.pictures()).toHaveLength(2);
    expect(component.linkedPictures()).toHaveLength(1);
    expect(component.linkedPictures()[0].id).toBe(2);
  });

  it('shows the linked picture with the fiche technique name overlaid as a caption', () => {
    const caption: HTMLElement = fixture.nativeElement.querySelector('.photo-tile-caption');
    expect(caption.textContent?.trim()).toBe('Pain perdu');
  });

  it('opens a lightbox with the full-size picture on click', () => {
    expect(component.lightboxPicture()).toBeNull();

    const thumbButton: HTMLButtonElement = fixture.nativeElement.querySelector('.photo-tile');
    thumbButton.click();
    fixture.detectChanges();

    expect(component.lightboxPicture()?.id).toBe(2);
    const lightboxImage: HTMLImageElement = fixture.nativeElement.querySelector('.lightbox-image');
    expect(lightboxImage.src).toContain('b.jpg');
  });
});
