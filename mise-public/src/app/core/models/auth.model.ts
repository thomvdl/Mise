export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: number;
  name: string;
  role: UserRole;
}

/** Name-only, for the login picker — never includes role or password. */
export interface PublicUser {
  id: number;
  name: string;
}
