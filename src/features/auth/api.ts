import { api, API_BASE_URL } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import {
  AuthTokens,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
} from '@/types/auth';
import axios from 'axios';

export const authApi = {
  login: async (payload: LoginPayload) => {
    const res = await api.post('/auth/login', payload);
    return unwrap<AuthTokens>(res).data;
  },

  refresh: async (refreshToken: string) => {
    const res = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Language': 'id',
        },
      }
    );
    return unwrap<AuthTokens>(res).data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return unwrap<AuthUser>(res).data;
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const res = await api.patch('/auth/change-password', payload);
    return unwrap<null>(res);
  },

  logout: async (refreshToken?: string | null) => {
    try {
      const res = await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
      return unwrap<null>(res);
    } catch {
      // Ignore network/server errors during logout
      return null;
    }
  },
};
