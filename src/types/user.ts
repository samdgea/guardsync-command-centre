import { UserRole } from './auth';

export interface User {
  id: string;
  employeeId: string;
  email: string | null;
  name: string;
  role: UserRole;
  active: boolean;
  profilePhotoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Check whether `actorRole` is allowed to edit the profile photo of a user
 * with `targetRole`. Matches backend logic in UserController@uploadUserPhoto.
 *
 * - SUPER_ADMIN can edit anyone's photo
 * - ADMIN can edit OFFICER, SUPERVISOR, and their own
 * - ADMIN cannot edit other ADMIN or SUPER_ADMIN
 */
export function canEditUserPhoto(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'SUPER_ADMIN') return true;
  if (actorRole === 'ADMIN') {
    return targetRole !== 'SUPER_ADMIN' && targetRole !== 'ADMIN';
  }
  return false;
}

export interface CreateUserPayload {
  employeeId: string;
  name: string;
  password: string;
  role: UserRole;
  email?: string;
  siteId?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
}

export interface ResetUserPasswordPayload {
  password: string;
}
