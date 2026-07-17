import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SimpleEntityList } from './simple-entity-list';
import { categoryConfig } from '../../core/config/simple-entity.config';
import { environment } from '../../../environments/environment';

describe('SimpleEntityList', () => {
  let component: SimpleEntityList;
  let fixture: ComponentFixture<SimpleEntityList>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleEntityList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleEntityList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', categoryConfig);
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/categories`).flush([]);

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
