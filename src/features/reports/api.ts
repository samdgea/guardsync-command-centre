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

export const reportsApi = {
  getVisits: async (params?: VisitFilterParams) => {
    const res = await api.get('/reports/visits', { params });
    return unwrap<PatrolVisit[]>(res);
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
  }) => {
    const res = await api.get('/reports/summary', { params });
    return unwrap<ReportSummary>(res).data;
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
