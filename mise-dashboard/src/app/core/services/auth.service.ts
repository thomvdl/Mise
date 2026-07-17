import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/auth.model';

const TOKEN_KEY = 'mise_token';
const USER_KEY = 'mise_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  user = signal<AuthUser | null>(this.readStoredUser());

  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  login(name: string, password: string) {
    return this.http.post<{ token: string; user: AuthUser }>(`${this.baseUrl}/login`, { name, password }).pipe(
      tap(({ token, user }) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.token.set(token);
        this.user.set(user);
      }),
    );
  }

  /** Clears local session state regardless of whether the server call succeeds. */
  logout(): void {
    const token = this.token();
    this.clearSession();
    if (token) {
      this.http.post(`${this.baseUrl}/logout`, {}).subscribe({ error: () => {} });
    }
    this.router.navigate(['/login']);
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
  }

  isAuthenticated(): boolean {
    return this.token() !== null;
  }

  isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }
}
