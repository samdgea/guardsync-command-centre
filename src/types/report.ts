export type PatrolCondition = 'AMAN' | 'WASPADA' | 'DARURAT';
export type ReviewStatus = 'PENDING' | 'REVIEWED' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED';

export interface PatrolPhoto {
  id: string;
  visitId: string;
  objectKey?: string;
  path: string;
  originalName?: string;
  mimeType?: string;
  createdAt: string;
}

export interface StatusLog {
  id: string;
  visitId: string;
  changedById?: string | null;
  changerName?: string | null;
  fromStatus?: ReviewStatus | null;
  toStatus: ReviewStatus;
  notes?: string | null;
  createdAt: string;
}

export interface PatrolVisit {
  id: string;
  sessionId?: string;
  checkpointId: string;
  siteId: string;
  userId: string;
  condition: PatrolCondition;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number;
  reviewStatus: ReviewStatus;
  cooldownBypassed?: boolean;
  createdAt: string;
  photos: PatrolPhoto[];
  statusLogs: StatusLog[];
  checkpoint?: {
    id?: string;
    code?: string;
    name?: string;
  };
  officer?: {
    id?: string;
    name?: string;
    employeeId?: string;
  };
}

export interface ReviewVisitPayload {
  status: ReviewStatus;
}

export interface BulkReviewPayload {
  ids: string[];
  status: ReviewStatus;
}

export interface ReportSummary {
  totalVisits: number;
  byCondition: {
    AMAN: number;
    WASPADA: number;
    DARURAT: number;
  };
  byReviewStatus: {
    PENDING: number;
    REVIEWED: number;
    ACKNOWLEDGED: number;
    ESCALATED: number;
    RESOLVED: number;
  };
}

export interface SiteCompliance {
  siteId: string;
  siteName: string;
  checkpoints: number;
  visits: number;
  complianceRate: number;
}

export interface OfficerCompliance {
  officerId: string;
  officerName: string;
  visits: number;
  onTime: number;
}

export interface ComplianceReport {
  totalCheckpoints: number;
  totalVisits: number;
  bySite: SiteCompliance[];
  byOfficer: OfficerCompliance[];
}

export interface ComplianceCheckpointItem {
  id: string;
  checkpointCode: string;
  checkpointName: string;
  description?: string | null;
  visited: boolean;
}

export interface SiteComplianceData {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  checkpoints: ComplianceCheckpointItem[];
}

export interface VisitFilterParams {
  page?: number;
  limit?: number;
  siteId?: string;
  condition?: PatrolCondition;
  reviewStatus?: ReviewStatus;
  from?: string;
  to?: string;
}

export interface ComplianceFilterParams {
  siteId?: string;
  date?: string;
  from?: string;
  to?: string;
}
