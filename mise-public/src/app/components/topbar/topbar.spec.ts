import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Topbar } from './topbar';

describe('Topbar', () => {
  let component: Topbar;
  let fixture: ComponentFixture<Topbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Topbar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Topbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides the offline badge while online', () => {
    component.isOffline.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.offline-badge')).toBeNull();
  });

  it('shows the offline badge when the browser goes offline', () => {
    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();

    expect(component.isOffline()).toBe(true);
    expect(fixture.nativeElement.querySelector('.offline-badge')?.textContent).toContain('Hors ligne');
  });

  it('hides the badge again once back online', () => {
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();

    expect(component.isOffline()).toBe(false);
    expect(fixture.nativeElement.querySelector('.offline-badge')).toBeNull();
  });
});
