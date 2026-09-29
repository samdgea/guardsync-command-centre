'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/features/auth/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PhotoUploader from '@/components/PhotoUploader';
import { UserCircle, Lock, Shield, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Kata sandi lama minimal 8 karakter'),
    newPassword: z.string().min(8, 'Kata sandi baru minimal 8 karakter'),
    newPassword_confirmation: z.string().min(8, 'Konfirmasi kata sandi minimal 8 karakter'),
  })
  .refine((data) => data.newPassword === data.newPassword_confirmation, {
    message: 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru',
    path: ['newPassword_confirmation'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(
    user?.profilePhotoUrl ?? null
  );

  const handlePhotoUpdated = useCallback(
    (newUrl: string | null) => {
      setProfilePhotoUrl(newUrl);
      if (user) {
        setUser({ ...user, profilePhotoUrl: newUrl });
      }
    },
    [user, setUser]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      newPassword_confirmation: '',
    },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await authApi.changePassword(values);
      toast.success('Kata sandi Anda berhasil diperbarui');
      reset();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || 'Gagal mengubah kata sandi'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          Profil Akun & Keamanan
        </h1>
        <p className="text-sm text-slate-500">
          Informasi kredensial administrator dan pengaturan keamanan kata sandi akun.
        </p>
      </div>

      {/* Profile Photo Section */}
      {user && (
        <Card>
          <CardContent className="pt-6">
            <PhotoUploader
              user={{
                id: user.id,
                employeeId: user.employeeId,
                email: user.email,
                name: user.name,
                role: user.role,
                active: user.active,
                profilePhotoUrl: profilePhotoUrl,
              }}
              currentUserRole={user.role}
              isOwnProfile
              size="xl"
              onPhotoUpdated={handlePhotoUpdated}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Detail Informasi Administrator
            </CardTitle>
            <CardDescription className="text-xs">
              Data terdaftar resmi pada sistem GuardSync
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Nama Lengkap</span>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {user?.name || '-'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Nomor Induk Karyawan (NIK)</span>
              <div className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
                {user?.employeeId || '-'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Alamat Email</span>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                {user?.email || 'Belum didaftarkan'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Tingkat Hak Akses (Role)</span>
              <div>
                <Badge
                  variant={user?.role === 'SUPER_ADMIN' ? 'default' : 'reviewed'}
                  className="text-xs"
                >
                  {user?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN (Global View)' : 'ADMIN (Assigned Scope)'}
                </Badge>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Penugasan Situs Operasional:
              </span>
              {user?.role === 'SUPER_ADMIN' ? (
                <div className="text-emerald-600 font-medium text-[11px]">
                  ● Memiliki akses global tanpa batas ke seluruh situs
                </div>
              ) : (user?.assignments && user.assignments.length > 0) ? (
                <div className="space-y-1">
                  {user.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-2 rounded bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {a.name || a.site?.name || a.siteId}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 italic text-[11px]">
                  Belum ada situs yang ditugaskan kepada akun ini.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              Ganti Kata Sandi Pribadi
            </CardTitle>
            <CardDescription className="text-xs">
              Perbarui kata sandi akun Anda secara berkala untuk menjaga keamanan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Kata Sandi Saat Ini</label>
                <Input
                  type="password"
                  placeholder="Masukkan kata sandi lama"
                  {...register('currentPassword')}
                />
                {errors.currentPassword && (
                  <p className="text-xs text-red-600 font-medium">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Kata Sandi Baru</label>
                <Input
                  type="password"
                  placeholder="Minimal 8 karakter"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="text-xs text-red-600 font-medium">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Konfirmasi Kata Sandi Baru</label>
                <Input
                  type="password"
                  placeholder="Ulangi kata sandi baru"
                  {...register('newPassword_confirmation')}
                />
                {errors.newPassword_confirmation && (
                  <p className="text-xs text-red-600 font-medium">
                    {errors.newPassword_confirmation.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-2 text-xs font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan Kata Sandi...
                  </>
                ) : (
                  'Perbarui Kata Sandi'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
