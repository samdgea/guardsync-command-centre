import { UserRole } from './auth';

export interface User {
  id: string;
  employeeId: string;
  email: string | null;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  employeeId: string;
  name: string;
  password: string;
  role: UserRole;
  email?: string;
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
