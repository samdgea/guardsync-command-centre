import { api } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import {
  BulkReviewPayload,
  ComplianceFilterParams,
  ComplianceReport,
  PatrolVisit,
  ReportSummary,
  ReviewVisitPayload,
  SiteComplianceData,
  VisitFilterParams,
} from '@/types/report';

export function normalizeReportSummary(raw: any): ReportSummary {
  if (!raw) {
    return {
      totalVisits: 0,
      total: 0,
      today: 0,
      activeSessions: 0,
      pending: 0,
      byCondition: { AMAN: 0, WASPADA: 0, DARURAT: 0 },
      byReviewStatus: { PENDING: 0, REVIEWED: 0, ACKNOWLEDGED: 0, ESCALATED: 0, RESOLVED: 0 },
    };
  }

  const byCondition = { AMAN: 0, WASPADA: 0, DARURAT: 0 };
  if (Array.isArray(raw.conditions)) {
    raw.conditions.forEach((item: any) => {
      const cond = item.condition as keyof typeof byCondition;
      if (cond && cond in byCondition) {
        byCondition[cond] = Number(item._count) || 0;
      }
    });
  } else if (raw.byCondition) {
    Object.assign(byCondition, raw.byCondition);
  }

  const byReviewStatus = {
    PENDING: raw.pending ?? 0,
    REVIEWED: 0,
    ACKNOWLEDGED: 0,
    ESCALATED: 0,
    RESOLVED: 0,
    ...(raw.byReviewStatus || {}),
  };

  const total = raw.total ?? raw.totalVisits ?? 0;

  return {
    totalVisits: total,
    total,
    today: raw.today ?? 0,
    activeSessions: raw.activeSessions ?? 0,
    pending: raw.pending ?? (byReviewStatus.PENDING || 0),
    conditions: raw.conditions,
    byCondition,
    byReviewStatus,
  };
}

export const reportsApi = {
  getVisits: async (params?: VisitFilterParams) => {
    const res = await api.get('/reports/visits', { params });
    const unwrapped = unwrap<any>(res);
    if (Array.isArray(unwrapped.data)) {
      return unwrapped as { data: PatrolVisit[]; message: string; pagination?: any };
    }
    return {
      ...unwrapped,
      data: [] as PatrolVisit[],
      summary: normalizeReportSummary(unwrapped.data),
    };
  },

  reviewVisit: async (id: string, payload: ReviewVisitPayload) => {
    const res = await api.patch(`/reports/visits/${id}/review`, payload);
    return unwrap<{ id: string; reviewStatus: string; updatedAt: string }>(res).data;
  },

  bulkReviewVisits: async (payload: BulkReviewPayload) => {
    const res = await api.patch('/reports/visits/bulk-review', payload);
    return unwrap<number>(res).data;
  },

  deleteVisit: async (id: string) => {
    const res = await api.delete(`/reports/visits/${id}`);
    return unwrap<null>(res);
  },

  getSummary: async (params?: {
    siteId?: string;
    condition?: string;
    reviewStatus?: string;
    from?: string;
    to?: string;
  }): Promise<ReportSummary> => {
    try {
      const res = await api.get('/reports/visits', { params });
      const rawData = unwrap<any>(res).data;
      if (rawData && !Array.isArray(rawData)) {
        return normalizeReportSummary(rawData);
      }
      const sumRes = await api.get('/reports/summary', { params });
      return normalizeReportSummary(unwrap<any>(sumRes).data);
    } catch {
      const sumRes = await api.get('/reports/summary', { params });
      return normalizeReportSummary(unwrap<any>(sumRes).data);
    }
  },

  getCompliance: async (params?: ComplianceFilterParams) => {
    const res = await api.get('/reports/compliance', { params });
    const rawData = unwrap<SiteComplianceData[] | SiteComplianceData>(res).data;
    if (Array.isArray(rawData)) {
      return rawData;
    }
    return rawData ? [rawData] : [];
  },

  exportCsv: async (params?: VisitFilterParams) => {
    const res = await api.get('/reports/visits/export', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `patrol-visits-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
