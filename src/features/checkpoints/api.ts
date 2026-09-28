import { api, API_BASE_URL } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import {
  Checkpoint,
  CreateCheckpointPayload,
  RotateQrResponse,
  UpdateCheckpointPayload,
} from '@/types/checkpoint';

export const checkpointsApi = {
  getCheckpoints: async (siteId?: string, params?: { page?: number; limit?: number }) => {
    const endpoint = siteId ? `/checkpoints/${siteId}` : '/checkpoints';
    const res = await api.get(endpoint, { params });
    return unwrap<Checkpoint[]>(res);
  },

  createCheckpoint: async (payload: CreateCheckpointPayload) => {
    const res = await api.post('/checkpoints', payload);
    return unwrap<Checkpoint>(res).data;
  },

  updateCheckpoint: async (id: string, payload: UpdateCheckpointPayload) => {
    const res = await api.patch(`/checkpoints/${id}`, payload);
    return unwrap<Checkpoint>(res).data;
  },

  rotateQr: async (id: string) => {
    const res = await api.post(`/checkpoints/${id}/qr/rotate`);
    return unwrap<RotateQrResponse>(res).data;
  },

  getQrBlobUrl: async (id: string) => {
    const res = await api.get(`/checkpoints/${id}/qr`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data);
  },
};
