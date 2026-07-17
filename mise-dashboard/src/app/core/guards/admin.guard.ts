import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Dashboard is admin-only — a logged-in 'user' account is redirected straight back out. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.isAdmin()) {
    return true;
  }

  if (auth.isAuthenticated() && !auth.isAdmin()) {
    auth.clearSession();
  }

  return router.createUrlTree(['/login']);
};
