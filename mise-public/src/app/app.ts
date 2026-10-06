import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Topbar } from './components/topbar/topbar';
import { InactivityLogoutService } from './core/services/inactivity-logout.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Topbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);

  protected readonly title = signal('mise-public');

  constructor() {
    // L'injection seule suffit : le service fait tout son travail dans son propre constructeur
    // (singleton `providedIn: 'root'`, instancié ici au tout premier `inject()`).
    inject(InactivityLogoutService);
  }

  /** The login screen renders full-page, without the app shell's topbar/nav. */
  isLoginPage = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.startsWith('/login')),
    ),
    { initialValue: this.router.url.startsWith('/login') },
  );
}
