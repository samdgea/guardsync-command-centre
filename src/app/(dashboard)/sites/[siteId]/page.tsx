'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '@/features/sites/api';
import { usersApi } from '@/features/users/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import {
  Building2,
  Users,
  UserPlus,
  Trash2,
  ArrowLeft,
  Clock,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const siteId = params.siteId as string;

  const [page, setPage] = useState(1);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [shift, setShift] = useState('PAGI');
  const [isPrimary, setIsPrimary] = useState(true);

  // Fetch site officers
  const { data: officersData, isLoading } = useQuery({
    queryKey: ['site-officers', siteId, page],
    queryFn: () => sitesApi.getSiteOfficers(siteId, { page, limit: 10 }),
    enabled: !!siteId,
  });

  // Fetch available officers/users to assign
  const { data: usersData } = useQuery({
    queryKey: ['available-users-for-assignment'],
    queryFn: () => usersApi.getUsers({ limit: 100, active: true }),
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { userId: string; shift: string; primary: boolean }) =>
      sitesApi.assignOfficer(siteId, payload),
    onSuccess: () => {
      toast.success('Petugas berhasil ditugaskan ke situs ini');
      queryClient.invalidateQueries({ queryKey: ['site-officers', siteId] });
      setIsAssignModalOpen(false);
      setSelectedUserId('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menugaskan petugas');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => sitesApi.removeOfficer(siteId, userId),
    onSuccess: () => {
      toast.success('Penugasan petugas berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['site-officers', siteId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus penugasan');
    },
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Silakan pilih petugas terlebih dahulu');
      return;
    }
    assignMutation.mutate({
      userId: selectedUserId,
      shift,
      primary: isPrimary,
    });
  };

  const officers = officersData?.data || [];
  const candidateUsers = usersData?.data || [];

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          href="/sites"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Kembali ke Daftar Situs
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Users className="h-6 w-6 text-slate-700 dark:text-slate-300" />
              Penugasan Petugas Satpam Situs
            </h1>
            <p className="text-xs text-slate-500">
              Kelola daftar satpam lapangan yang berwenang melakukan patroli di lokasi ini.
            </p>
          </div>
          <Button onClick={() => setIsAssignModalOpen(true)} className="text-xs">
            <UserPlus className="h-4 w-4 mr-1.5" />
            Tugaskan Petugas
          </Button>
        </div>
      </div>

      {/* Officers Table */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Daftar Petugas Aktif di Situs</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : officers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada petugas yang ditugaskan ke situs ini. Klik "Tugaskan Petugas" untuk menambahkan.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Petugas</TableHead>
                  <TableHead>NIK / ID Karyawan</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Basis Utama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officers.map((officer) => (
                  <TableRow key={officer.id}>
                    <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {officer.user?.name || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      {officer.user?.employeeId || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {officer.user?.role || 'OFFICER'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {officer.shift || 'PAGI'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {officer.primary ? (
                        <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Pangkalan Utama
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Bantuan / Sekunder</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={officer.active ? 'aman' : 'secondary'} className="text-[10px]">
                        {officer.active ? 'AKTIF' : 'NONAKTIF'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Hapus Penugasan"
                        onClick={() => {
                          if (confirm(`Hapus penugasan ${officer.user?.name} dari situs ini?`)) {
                            removeMutation.mutate(officer.userId);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Pagination meta={officersData?.pagination} onPageChange={setPage} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Assign Officer Dialog */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tugaskan Petugas ke Situs Ini</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Pilih Petugas (User)</label>
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs focus:ring-2 focus:ring-slate-900"
              >
                <option value="">-- Pilih Satpam / Supervisor --</option>
                {candidateUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.employeeId} - {u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Shift Penugasan</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs focus:ring-2 focus:ring-slate-900"
              >
                <option value="PAGI">Shift Pagi (07:00 - 15:00)</option>
                <option value="SIANG">Shift Siang (15:00 - 23:00)</option>
                <option value="MALAM">Shift Malam (23:00 - 07:00)</option>
                <option value="GENERAL">General / Bebas</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
              />
              <label htmlFor="isPrimary" className="text-xs text-slate-700 dark:text-slate-300">
                Tandai sebagai pangkalan utama (primary site) petugas
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={assignMutation.isPending}>
                Tugaskan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
