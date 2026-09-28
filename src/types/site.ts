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
  shift?: string | null;
  primary?: boolean;
  startDate?: string;
  endDate?: string | null;
  active: boolean;
  user: {
    id: string;
    name: string;
    employeeId: string;
    role: string;
  };
}

export interface AssignOfficerPayload {
  userId: string;
  shift?: string;
  primary?: boolean;
}
