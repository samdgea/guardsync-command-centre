export interface Shift {
  id: string;
  siteId?: string | null;
  site?: {
    id: string;
    name: string;
    code: string;
  } | null;
  code: string;
  name: string;
  startTime?: string | null;
  endTime?: string | null;
  lateToleranceMinutes?: number;
  isOvernight?: boolean;
  isOff?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShiftPayload {
  siteId?: string | null;
  code?: string;
  name: string;
  startTime?: string | null;
  endTime?: string | null;
  lateToleranceMinutes?: number;
  isOff?: boolean;
  active?: boolean;
}

export interface UpdateShiftPayload {
  name?: string;
  code?: string;
  siteId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  lateToleranceMinutes?: number;
  isOff?: boolean;
  active?: boolean;
}

export interface GetShiftsParams {
  siteId?: string;
  activeOnly?: boolean;
}

export type ScheduleType = 'ROSTER' | 'FIXED' | null;

export interface RosterTeam {
  id: string;
  siteId: string;
  code: string;
  name: string;
  shiftPattern: string[];
  patternStartDate: string;
  active: boolean;
  assignmentsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRosterTeamPayload {
  code: string;
  name: string;
  shiftPattern: string[];
  patternStartDate: string;
  active?: boolean;
}

export interface UpdateRosterTeamPayload {
  code?: string;
  name?: string;
  shiftPattern?: string[];
  patternStartDate?: string;
  active?: boolean;
}

export interface SiteRosterScheduleItem {
  date: string;
  dayOfWeek: number;
  dayName: string;
  shift: Shift | null;
  isOffDay: boolean;
}

export interface SiteRosterOfficer {
  user: {
    id: string;
    name: string;
    employeeId: string;
    role?: string;
  };
  scheduleType: ScheduleType;
  rosterTeam: {
    id: string;
    code: string;
    name: string;
  } | null;
  workDays: number[] | null;
  shiftPattern: string[] | null;
  patternStartDate: string | null;
  schedule: SiteRosterScheduleItem[];
}

export interface SiteRosterResponse {
  site: {
    id: string;
    name: string;
    code: string;
  };
  startDate: string;
  endDate: string;
  totalDays: number;
  roster: SiteRosterOfficer[];
}

export interface MyScheduleResponse {
  site: {
    id: string;
    name: string;
    code: string;
  };
  scheduleType: ScheduleType;
  rosterTeam: {
    id: string;
    code: string;
    name: string;
  } | null;
  workDays: number[] | null;
  shiftPattern: string[] | null;
  patternStartDate: string | null;
  schedule: SiteRosterScheduleItem[];
}
