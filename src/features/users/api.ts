import { api } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import {
  CreateUserPayload,
  ResetUserPasswordPayload,
  UpdateUserPayload,
  User,
} from '@/types/user';

export const usersApi = {
  getUsers: async (params?: { page?: number; limit?: number; active?: boolean }) => {
    const res = await api.get('/users', { params });
    return unwrap<User[]>(res);
  },

  createUser: async (payload: CreateUserPayload) => {
    const res = await api.post('/users', payload);
    return unwrap<User>(res).data;
  },

  updateUser: async (id: string, payload: UpdateUserPayload) => {
    const res = await api.patch(`/users/${id}`, payload);
    return unwrap<User>(res).data;
  },

  deleteUser: async (id: string) => {
    const res = await api.delete(`/users/${id}`);
    return unwrap<null>(res);
  },

  resetPassword: async (id: string, payload: ResetUserPasswordPayload) => {
    const res = await api.post(`/users/${id}/reset-password`, payload);
    return unwrap<null>(res);
  },
};
