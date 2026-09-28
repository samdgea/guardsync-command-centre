export interface ActivePatrolSession {
  id: string;
  siteId: string;
  code: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  startedAt: string;
  endedAt?: string | null;
  officerName?: string;
  siteName?: string;
}
