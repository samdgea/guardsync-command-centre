import { api } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import {
  CreateUserPayload,
  ResetUserPasswordPayload,
  UpdateUserPayload,
  User,
} from '@/types/user';

import { uploadProfilePhotoDirect } from '@/lib/uploadService';

export const usersApi = {
  getUsers: async (params?: { page?: number; limit?: number; active?: boolean; siteId?: string }) => {
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

  /**
   * Upload profile photo for a user via direct S3 pre-signed URL.
   * Pass 'me' as userId to upload for the currently authenticated user.
   */
  uploadProfilePhoto: async (
    userId: string | 'me',
    file: File,
    onProgress?: (percentage: number) => void
  ): Promise<{ profilePhotoUrl: string }> => {
    const profilePhotoUrl = await uploadProfilePhotoDirect(userId, file, onProgress);
    return { profilePhotoUrl };
  },

  /**
   * Delete profile photo for a user.
   * Pass 'me' as userId to delete for the currently authenticated user.
   */
  deleteProfilePhoto: async (userId: string | 'me'): Promise<void> => {
    const endpoint = userId === 'me' ? '/auth/me/photo' : `/users/${userId}/photo`;
    const res = await api.delete(endpoint);
    unwrap<null>(res);
  },
};
