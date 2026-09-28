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

  downloadAllCheckpoints: async (siteId: string) => {
    let res;
    try {
      res = await api.get(`/checkpoints/${siteId}/download`, {
        responseType: 'blob',
      });
    } catch (err: any) {
      let errorMessage = 'Gagal mengunduh QR Checkpoint';

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) {
            errorMessage = json.message;
          }
        } catch {
          if (err.response?.statusText) {
            errorMessage = err.response.statusText;
          }
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      if (err.response?.status === 403 && (!errorMessage || errorMessage === 'Gagal mengunduh QR Checkpoint')) {
        errorMessage = 'Forbidden';
      } else if (err.response?.status === 401) {
        errorMessage = 'Unauthorized: Sesi telah berakhir atau tidak memiliki izin';
      }

      throw new Error(errorMessage);
    }

    if (res.data.type === 'application/json') {
      const text = await res.data.text();
      try {
        const json = JSON.parse(text);
        if (json.success === false || json.message) {
          throw new Error(json.message || 'Gagal mengunduh QR Checkpoint');
        }
      } catch (parseErr: any) {
        if (parseErr.message && !parseErr.message.includes('JSON')) {
          throw parseErr;
        }
      }
    }

    const contentDisposition = res.headers['content-disposition'];
    let filename = `checkpoints-${siteId}.pdf`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim());
      }
    }

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
