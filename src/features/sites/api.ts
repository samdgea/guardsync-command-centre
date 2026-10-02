import { api } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import {
  AssignOfficerPayload,
  CreateSitePayload,
  Site,
  SiteOfficer,
  UpdateOfficerAssignmentPayload,
  UpdateSitePayload,
} from '@/types/site';

export const sitesApi = {
  getSites: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get('/sites', { params });
    return unwrap<Site[]>(res);
  },

  getSite: async (id: string) => {
    const res = await api.get(`/sites/${id}`);
    return unwrap<Site>(res).data;
  },

  createSite: async (payload: CreateSitePayload) => {
    const res = await api.post('/sites', payload);
    return unwrap<Site>(res).data;
  },

  updateSite: async (id: string, payload: UpdateSitePayload) => {
    const res = await api.patch(`/sites/${id}`, payload);
    return unwrap<Site>(res).data;
  },

  deleteSite: async (id: string) => {
    const res = await api.delete(`/sites/${id}`);
    return unwrap<null>(res);
  },

  getSiteOfficers: async (siteId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get(`/sites/${siteId}/officers`, { params });
    return unwrap<SiteOfficer[]>(res);
  },

  assignOfficer: async (siteId: string, payload: AssignOfficerPayload) => {
    const res = await api.post(`/sites/${siteId}/officers`, payload);
    return unwrap<SiteOfficer>(res).data;
  },

  updateOfficerAssignment: async (
    siteId: string,
    userId: string,
    payload: UpdateOfficerAssignmentPayload
  ) => {
    const res = await api.patch(`/sites/${siteId}/officers/${userId}`, payload);
    return unwrap<SiteOfficer>(res).data;
  },

  removeOfficer: async (siteId: string, userId: string) => {
    const res = await api.delete(`/sites/${siteId}/officers/${userId}`);
    return unwrap<null>(res);
  },
};

