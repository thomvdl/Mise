export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface ManagedUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface ManagedUserPayload {
  name: string;
  password?: string;
  role: UserRole;
}

/** Name-only, for the public login picker — never includes role or password. */
export interface PublicUser {
  id: number;
  name: string;
}
