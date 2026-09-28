import { api } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import { ActivePatrolSession } from '@/types/patrol';

export const patrolSessionsApi = {
  getActiveSessions: async () => {
    const res = await api.get('/patrols/sessions/active');
    return unwrap<ActivePatrolSession[]>(res).data;
  },
};
