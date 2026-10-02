import { RosterTeam, ScheduleType, Shift } from './shift';

export interface Site {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
  enforceGeofence?: boolean;
  pic?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSitePayload {
  code: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  enforceGeofence?: boolean;
  pic?: string;
}

export interface UpdateSitePayload {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  enforceGeofence?: boolean;
  pic?: string;
  active?: boolean;
}

export interface SiteOfficer {
  id: string;
  userId: string;
  siteId: string;
  scheduleType?: ScheduleType;
  rosterTeamId?: string | null;
  rosterTeam?: {
    id: string;
    code: string;
    name: string;
  } | null;
  shiftId?: string | null;
  shift?: Shift | null;
  shiftPattern?: string[] | null;
  patternStartDate?: string | null;
  workDays?: number[] | null;
  todayShift?: Shift | null;
  isOffDay?: boolean;
  primary?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  user: {
    id: string;
    name: string;
    employeeId: string;
    role: string;
  };
}

export interface AssignOfficerPayload {
  userId: string;
  scheduleType?: ScheduleType;
  rosterTeamId?: string | null;
  shiftId?: string | null;
  workDays?: number[] | null;
  primary?: boolean;
}

export interface UpdateOfficerAssignmentPayload {
  scheduleType?: ScheduleType;
  rosterTeamId?: string | null;
  shiftId?: string | null;
  workDays?: number[] | null;
  primary?: boolean;
  active?: boolean;
}
