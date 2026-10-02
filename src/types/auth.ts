import { RosterTeam, ScheduleType, Shift } from './shift';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'OFFICER';

export interface SiteAssignmentBrief {
  id: string;
  userId?: string;
  siteId: string;
  scheduleType?: ScheduleType;
  rosterTeamId?: string | null;
  rosterTeam?: {
    id: string;
    code: string;
    name: string;
  } | null;
  shiftId?: string | null;
  shift?: Shift | string | null;
  todayShift?: Shift | null;
  isOffDay?: boolean;
  workDays?: number[] | null;
  shiftPattern?: string[] | null;
  patternStartDate?: string | null;
  primary?: boolean;
  name?: string;
  code?: string;
  site?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface AuthUser {
  id: string;
  employeeId: string;
  email: string | null;
  name: string;
  role: UserRole;
  active: boolean;
  profilePhotoUrl?: string | null;
  assignments: SiteAssignmentBrief[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  newPassword_confirmation: string;
}
