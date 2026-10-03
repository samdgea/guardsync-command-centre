'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/features/users/api';
import { useAuthStore } from '@/stores/authStore';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { User, CreateUserPayload, UpdateUserPayload, canEditUserPhoto } from '@/types/user';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import PhotoUploader from '@/components/PhotoUploader';
import { Users, UserPlus, Edit, KeyRound, UserX, Search, Camera, Building2, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const { selectedSiteId, setSelectedSiteId, sitesList } = useSiteContextStore();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoModalUser, setPhotoModalUser] = useState<User | null>(null);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Determine site assignments for ADMIN
  const assignedSites = useMemo(() => {
    if (isSuperAdmin) {
      return sitesList;
    }
    const assignments = currentUser?.assignments || [];
    return assignments.map((a) => {
      const match = sitesList.find((s) => s.id === (a.siteId || a.id));
      if (match) return match;
      return {
        id: a.siteId || a.id,
        name: a.name || a.site?.name || 'Situs Penugasan',
        code: a.code || a.site?.code || 'SITE',
        active: true,
      };
    });
  }, [isSuperAdmin, sitesList, currentUser?.assignments]);

  // Determine active site ID (scoping users)
  const activeSiteId = useMemo(() => {
    if (isSuperAdmin) {
      return selectedSiteId || '';
    }
    if (selectedSiteId && assignedSites.some((s) => s.id === selectedSiteId)) {
      return selectedSiteId;
    }
    if (assignedSites.length > 0) {
      return assignedSites[0].id;
    }
    return '';
  }, [isSuperAdmin, selectedSiteId, assignedSites]);

  // Synchronize site selection for single-site or initial admin
  useEffect(() => {
    if (!isSuperAdmin && activeSiteId && selectedSiteId !== activeSiteId) {
      setSelectedSiteId(activeSiteId);
    }
  }, [isSuperAdmin, activeSiteId, selectedSiteId, setSelectedSiteId]);

  // Reset page when active site changes
  useEffect(() => {
    setPage(1);
  }, [activeSiteId]);

  const currentSite = useMemo(() => {
    if (isSuperAdmin) {
      return sitesList.find((s) => s.id === activeSiteId);
    }
    return assignedSites.find((s) => s.id === activeSiteId);
  }, [isSuperAdmin, sitesList, assignedSites, activeSiteId]);

  // Form create / edit state
  const [formData, setFormData] = useState<CreateUserPayload>({
    employeeId: '',
    name: '',
    email: '',
    password: '',
    role: 'OFFICER',
    siteId: activeSiteId || undefined,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users-list', activeSiteId, page],
    queryFn: () => usersApi.getUsers({ page, limit: 10, siteId: activeSiteId || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.createUser(payload),
    onSuccess: () => {
      toast.success('Pengguna berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal membuat pengguna');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      usersApi.updateUser(id, payload),
    onSuccess: () => {
      toast.success('Data pengguna berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui pengguna');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      toast.success('Pengguna berhasil dinonaktifkan');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menonaktifkan pengguna');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id, { password }),
    onSuccess: () => {
      toast.success('Kata sandi pengguna berhasil disetel ulang');
      setIsResetModalOpen(false);
      setNewResetPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal mereset kata sandi');
    },
  });

  const handleOpenPhoto = (user: User) => {
    setPhotoModalUser(user);
    setIsPhotoModalOpen(true);
  };

  const handlePhotoUpdated = (newUrl: string | null) => {
    queryClient.invalidateQueries({ queryKey: ['users-list'] });
    if (photoModalUser) {
      setPhotoModalUser({ ...photoModalUser, profilePhotoUrl: newUrl });
    }
  };

  const handleOpenAdd = () => {
    setTargetUser(null);
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      password: '',
      role: 'OFFICER',
      siteId: activeSiteId || undefined,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setTargetUser(user);
    setFormData({
      employeeId: user.employeeId,
      name: user.name,
      email: user.email || '',
      password: '',
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleOpenReset = (user: User) => {
    setTargetUser(user);
    setNewResetPassword('');
    setIsResetModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUser) {
      updateMutation.mutate({
        id: targetUser.id,
        payload: {
          name: formData.name,
          email: formData.email || undefined,
          role: formData.role,
        },
      });
    } else {
      createMutation.mutate({
        ...formData,
        siteId: activeSiteId || undefined,
      });
    }
  };

  const users = data?.data || [];
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  if (!isSuperAdmin && assignedSites.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <Building2 className="h-10 w-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Belum Ada Situs Ditugaskan
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Akun Admin Anda belum memiliki penugasan situs. Silakan hubungi Super Admin untuk menugaskan akun Anda ke situs pos pengamanan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Users className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Manajemen Pengguna & Petugas
          </h1>
          <p className="text-sm text-slate-500">
            Kelola akun petugas satpam lapangan, supervisor, dan staf admin command centre.
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="text-xs">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Tambah Pengguna Baru
        </Button>
      </div>

      {/* Controls: Search & Site Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari nama, NIK, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Site Scope Context Badge or Selector */}
        {!isSuperAdmin && assignedSites.length === 1 && currentSite && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-500">Situs:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
              {currentSite.name} ({currentSite.code})
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              Terkunci
            </Badge>
          </div>
        )}

        {!isSuperAdmin && assignedSites.length > 1 && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Situs:</span>
            <select
              value={activeSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              {assignedSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Filter Situs:</span>
            <select
              value={activeSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value === '' ? null : e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="">Semua Site (Global View)</option>
              {sitesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            Tidak ada pengguna ditemukan.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIK / ID Karyawan</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Email Akun</TableHead>
                <TableHead>Peran (Role)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {u.employeeId}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {u.name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {u.email || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.role === 'SUPER_ADMIN'
                          ? 'default'
                          : u.role === 'ADMIN'
                          ? 'reviewed'
                          : 'outline'
                      }
                      className="text-[10px]"
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'aman' : 'secondary'} className="text-[10px]">
                      {u.active ? 'AKTIF' : 'NONAKTIF'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {canEditUserPhoto(currentUser?.role ?? 'OFFICER', u.role) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        title="Ubah Foto Profil"
                        onClick={() => handleOpenPhoto(u)}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                      title="Reset Kata Sandi"
                      onClick={() => handleOpenReset(u)}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-600"
                      title="Edit Pengguna"
                      onClick={() => handleOpenEdit(u)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Nonaktifkan Akun"
                      onClick={() => {
                        if (confirm(`Nonaktifkan akun ${u.name}?`)) {
                          deleteMutation.mutate(u.id);
                        }
                      }}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Pagination meta={data?.pagination} onPageChange={setPage} isLoading={isLoading} />
      </div>

      {/* Modal Add / Edit User */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {targetUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {!targetUser && currentSite && (
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span>
                  Pengguna baru akan otomatis ditugaskan ke situs{' '}
                  <strong>{currentSite.name}</strong> ({currentSite.code}).
                </span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold">Nomor Induk Karyawan (NIK)</label>
              <Input
                required
                disabled={!!targetUser}
                placeholder="Contoh: SEC-009 atau EMP-SPV-02"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Nama Lengkap</label>
              <Input
                required
                placeholder="Contoh: Hendra Wijaya"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Email (Opsional)</label>
              <Input
                type="email"
                placeholder="hendra@guardsync.id"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {!targetUser && (
              <div className="space-y-1">
                <label className="text-xs font-semibold">Kata Sandi Awal</label>
                <Input
                  required
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold">Peran Akun (Role)</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs focus:ring-2 focus:ring-slate-900"
              >
                {/* RBAC: Sembunyikan SUPER_ADMIN dan ADMIN jika login bukan SUPER_ADMIN */}
                {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN (Akses Global)</option>}
                {isSuperAdmin && <option value="ADMIN">ADMIN (Cakupan Site Ditugaskan)</option>}
                <option value="SUPERVISOR">SUPERVISOR (Pengawas & Reviewer)</option>
                <option value="OFFICER">OFFICER (Satpam Lapangan / Mobile)</option>
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {targetUser ? 'Simpan Perubahan' : 'Buat Akun'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Quick Reset Password */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <KeyRound className="h-5 w-5" />
              Reset Kata Sandi Pengguna
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (targetUser && newResetPassword) {
                resetPasswordMutation.mutate({
                  id: targetUser.id,
                  password: newResetPassword,
                });
              }
            }}
            className="space-y-4 pt-2"
          >
            <p className="text-xs text-slate-500">
              Setel kata sandi baru untuk <strong>{targetUser?.name}</strong> ({targetUser?.employeeId}). Kata sandi lama tidak dibutuhkan.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Kata Sandi Baru</label>
              <Input
                required
                type="password"
                placeholder="Minimal 8 karakter"
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsResetModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? 'Mereset...' : 'Simpan Sandi Baru'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Photo Upload Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Ubah Foto Profil — {photoModalUser?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-center pt-4 pb-2">
            {photoModalUser && currentUser && (
              <PhotoUploader
                user={photoModalUser}
                currentUserRole={currentUser.role}
                isOwnProfile={false}
                onPhotoUpdated={handlePhotoUpdated}
              />
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setIsPhotoModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
