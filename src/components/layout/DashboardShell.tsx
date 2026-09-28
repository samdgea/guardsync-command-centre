'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/features/auth/api';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { canAccessSite } from '@/lib/site-scope-guard';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAndRedirectToLogin = useAuthStore((s) => s.clearAndRedirectToLogin);
  const [isVerifying, setIsVerifying] = useState(true);
  const hasCheckedRef = useRef(false);

  // Fallback to guarantee hydration flag is set on client mount
  useEffect(() => {
    if (!isInitialized) {
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().isInitialized) {
          setInitialized(true);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, setInitialized]);

  // Auth verification once store is hydrated
  useEffect(() => {
    if (!isInitialized || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    let isMounted = true;

    async function checkAuth() {
      const state = useAuthStore.getState();
      const currentAccessToken = state.accessToken;
      const currentRefreshToken = state.refreshToken;

      // 1. If neither token exists in storage, user is not logged in
      if (!currentAccessToken && !currentRefreshToken) {
        clearAndRedirectToLogin();
        return;
      }

      // 2. If access token is missing but refresh token exists, proactively refresh
      if (!currentAccessToken && currentRefreshToken) {
        try {
          const newTokens = await authApi.refresh(currentRefreshToken);
          useAuthStore.getState().setTokens(newTokens.accessToken, newTokens.refreshToken);
        } catch {
          if (isMounted) {
            clearAndRedirectToLogin();
          }
          return;
        }
      }

      // 3. Verify and synchronize user profile with /auth/me
      try {
        const profile = await authApi.getMe();
        if (isMounted) {
          setUser(profile);
          setIsVerifying(false);
        }
      } catch (err: any) {
        if (!isMounted) return;

        // If 401 Unauthorized (and auto-refresh in interceptor failed):
        if (err.response?.status === 401) {
          clearAndRedirectToLogin();
        } else if (state.user) {
          // If network failure / 500 error, but we have cached user from localStorage,
          // keep the session active and do not wipe the credentials
          setIsVerifying(false);
        } else {
          clearAndRedirectToLogin();
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [isInitialized, clearAndRedirectToLogin, setUser]);

  // Client-side anti cross-site guard for ADMIN
  useEffect(() => {
    if (!isVerifying && user) {
      const siteIdParam = params?.siteId as string | undefined;
      if (siteIdParam && !canAccessSite(user, siteIdParam)) {
        toast.error('Anda tidak memiliki izin mengakses situs ini.');
        router.replace('/dashboard');
      }
    }
  }, [isVerifying, user, params, router]);

  if (isVerifying) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="flex flex-col items-center space-y-4 max-w-sm w-full">
          <div className="h-10 w-10 rounded-lg bg-slate-900 dark:bg-slate-100 animate-pulse" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Menghubungkan ke GuardSync Command Centre...
          </p>
          <Skeleton className="h-2 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
