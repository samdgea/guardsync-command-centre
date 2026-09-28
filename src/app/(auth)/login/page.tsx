'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/features/auth/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Shield, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = z.object({
  identifier: z.string().min(1, 'NIK atau Email wajib diisi'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const { setTokens, setUser, isAuthenticated, isInitialized } = useAuthStore();
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace(redirectUrl);
    }
  }, [isInitialized, isAuthenticated, redirectUrl, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setServerErrors(null);

    try {
      const tokens = await authApi.login(values);
      setTokens(tokens.accessToken, tokens.refreshToken);

      const userProfile = await authApi.getMe();
      setUser(userProfile);

      toast.success(`Selamat datang, ${userProfile.name}`);
      router.push(redirectUrl);
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.data) {
        setServerErrors(err.response.data.data);
      } else {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          'Gagal masuk. Periksa kembali NIK/Email dan kata sandi Anda.';
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-md border-slate-200 dark:border-slate-800">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold">
          <Shield className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          GuardSync Command Centre
        </CardTitle>
        <CardDescription className="text-sm">
          Portal Pemantauan & Kontrol Operasional Petugas Satpam
        </CardDescription>
      </CardHeader>

      <CardContent>
        {serverErrors && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {Object.entries(serverErrors).map(([field, msgs]) => (
                <div key={field}>
                  <span className="font-semibold capitalize">{field}: </span>
                  {msgs.join(', ')}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="identifier"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <User className="h-3.5 w-3.5 text-slate-500" />
              NIK atau Email
            </label>
            <Input
              id="identifier"
              type="text"
              placeholder="Contoh: EMP-ADMIN-01 atau admin@guardsync.id"
              autoComplete="username"
              disabled={isLoading}
              {...register('identifier')}
            />
            {errors.identifier && (
              <p className="text-xs text-red-600 font-medium">
                {errors.identifier.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              Kata Sandi
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Minimal 8 karakter"
              autoComplete="current-password"
              disabled={isLoading}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-600 font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Memverifikasi Akun...
              </>
            ) : (
              'Masuk ke Command Centre'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          Akses dibatasi khusus untuk Administrator & Pengawas Resmi.
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <Suspense fallback={<div className="text-sm text-slate-500">Memuat formulir login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}