import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Make sure no trailing slash or /api
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Language': 'id',
  },
});

// Mutex / Queue state for one-time use refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Bearer Token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  let token = useAuthStore.getState().accessToken;
  if (!token && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('guardsync_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.accessToken) {
          token = parsed.state.accessToken;
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401 with Single-Use Refresh Token Mutex
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 Unauthorized and not already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Do not attempt refresh if the failed request itself is login or refresh
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        // Enqueue subsequent 401 requests while refresh is in flight
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      let refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('guardsync_auth');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.state?.refreshToken) {
              refreshToken = parsed.state.refreshToken;
            }
          }
        } catch {
          // ignore parse errors
        }
      }

      if (!refreshToken) {
        isRefreshing = false;
        useAuthStore.getState().clearAndRedirectToLogin();
        return Promise.reject(error);
      }

      try {
        // Refresh token call (raw axios to prevent interceptor loop)
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': 'id',
          },
        });

        const newAccessToken = response.data?.data?.accessToken;
        const newRefreshToken = response.data?.data?.refreshToken;

        if (!newAccessToken || !newRefreshToken) {
          throw new Error('Format token baru tidak valid');
        }

        // Store new pair of tokens
        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

        // Process queued requests
        processQueue(null, newAccessToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().clearAndRedirectToLogin();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
