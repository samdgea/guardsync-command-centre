import { api } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import { LogBook, LogBookEntry } from '@/types/logbook';

export const logbooksApi = {
  getLogBooks: async (params?: {
    page?: number;
    limit?: number;
    siteId?: string;
    status?: string;
    date?: string;
  }) => {
    const res = await api.get('/logbooks', { params });
    return unwrap<LogBook[]>(res);
  },

  getLogBookDetail: async (id: string) => {
    const res = await api.get(`/logbooks/${id}`);
    return unwrap<LogBook>(res).data;
  },

  getLogBookEntries: async (
    logBookId: string,
    params?: { category?: string; from?: string; to?: string }
  ) => {
    const res = await api.get(`/logbooks/${logBookId}/entries`, { params });
    return unwrap<LogBookEntry[]>(res);
  },
};
