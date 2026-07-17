import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SimpleEntityForm } from './simple-entity-form';
import { categoryConfig } from '../../core/config/simple-entity.config';

describe('SimpleEntityForm', () => {
  let component: SimpleEntityForm;
  let fixture: ComponentFixture<SimpleEntityForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleEntityForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleEntityForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', categoryConfig);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
