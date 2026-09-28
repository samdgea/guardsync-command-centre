import { api } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import {
  CreateInventoryPayload,
  InventoryItem,
  UpdateInventoryPayload,
} from '@/types/inventory';

export const inventoryApi = {
  getInventory: async (siteId: string) => {
    const res = await api.get('/inventory', { params: { siteId } });
    return unwrap<InventoryItem[]>(res).data;
  },

  createInventory: async (payload: CreateInventoryPayload) => {
    const res = await api.post('/inventory', payload);
    return unwrap<InventoryItem>(res).data;
  },

  updateInventory: async (id: string, payload: UpdateInventoryPayload) => {
    const res = await api.patch(`/inventory/${id}`, payload);
    return unwrap<InventoryItem>(res).data;
  },

  deleteInventory: async (id: string) => {
    const res = await api.delete(`/inventory/${id}`);
    return unwrap<null>(res);
  },
};
