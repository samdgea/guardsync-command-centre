import { api } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import {
  CreateRosterTeamPayload,
  CreateShiftPayload,
  MyScheduleResponse,
  RosterTeam,
  Shift,
  SiteRosterResponse,
  UpdateRosterTeamPayload,
} from '@/types/shift';

export const shiftsApi = {
  /**
   * Mengambil daftar master shift kerja (global & spesifik site)
   */
  getShifts: async (params?: { siteId?: string; active?: boolean }) => {
    const res = await api.get('/shifts', { params });
    return unwrap<Shift[]>(res);
  },

  /**
   * Membuat master shift baru
   */
  createShift: async (payload: CreateShiftPayload) => {
    const res = await api.post('/shifts', payload);
    return unwrap<Shift>(res).data;
  },

  /**
   * Mengambil daftar tim roster di site tertentu
   */
  getRosterTeams: async (siteId: string) => {
    const res = await api.get(`/sites/${siteId}/roster-teams`);
    return unwrap<RosterTeam[]>(res);
  },

  /**
   * Mengambil detail satu tim roster
   */
  getRosterTeam: async (siteId: string, id: string) => {
    const res = await api.get(`/sites/${siteId}/roster-teams/${id}`);
    return unwrap<RosterTeam>(res).data;
  },

  /**
   * Membuat tim roster baru di site
   */
  createRosterTeam: async (siteId: string, payload: CreateRosterTeamPayload) => {
    const res = await api.post(`/sites/${siteId}/roster-teams`, payload);
    return unwrap<RosterTeam>(res).data;
  },

  /**
   * Memperbarui tim roster di site
   */
  updateRosterTeam: async (
    siteId: string,
    id: string,
    payload: UpdateRosterTeamPayload
  ) => {
    const res = await api.patch(`/sites/${siteId}/roster-teams/${id}`, payload);
    return unwrap<RosterTeam>(res).data;
  },

  /**
   * Menghapus tim roster dari site
   */
  deleteRosterTeam: async (siteId: string, id: string) => {
    const res = await api.delete(`/sites/${siteId}/roster-teams/${id}`);
    return unwrap<null>(res);
  },

  /**
   * Helper dropdown tim roster aktif per site
   */
  getTeamsDropdown: async (siteId: string) => {
    const res = await api.get('/shifts/teams', { params: { siteId } });
    return unwrap<RosterTeam[]>(res);
  },

  /**
   * Mengambil kalender matriks jadwal giliran shift seluruh petugas site
   */
  getSiteRoster: async (params: {
    siteId: string;
    startDate?: string;
    endDate?: string;
    days?: number;
  }) => {
    const res = await api.get('/shifts/roster', { params });
    return unwrap<SiteRosterResponse>(res).data;
  },

  /**
   * Mengambil kalender giliran shift pribadi petugas
   */
  getMySchedule: async (params?: {
    siteId?: string;
    startDate?: string;
    days?: number;
  }) => {
    const res = await api.get('/shifts/my-schedule', { params });
    return unwrap<MyScheduleResponse>(res).data;
  },
};
