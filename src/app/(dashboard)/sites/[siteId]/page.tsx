'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '@/features/sites/api';
import { SiteOfficer } from '@/types/site';
import { Button } from '@/components/ui/button';
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
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Clock,
  CheckCircle,
  Layers,
  Coffee,
  Calendar,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { SiteNavigationTabs } from '@/components/sites/SiteNavigationTabs';
import { AssignOfficerModal } from '@/components/sites/AssignOfficerModal';
import { MasterShiftModal } from '@/components/sites/MasterShiftModal';
import { RosterTeamFormModal } from '@/components/sites/RosterTeamFormModal';

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const siteId = params.siteId as string;

  const [page, setPage] = useState(1);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMasterShiftModalOpen, setIsMasterShiftModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [officerToEdit, setOfficerToEdit] = useState<SiteOfficer | null>(null);

  // Fetch site officers
  const { data: officersData, isLoading } = useQuery({
    queryKey: ['site-officers', siteId, page],
    queryFn: () => sitesApi.getSiteOfficers(siteId, { page, limit: 10 }),
    enabled: !!siteId,
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => sitesApi.removeOfficer(siteId, userId),
    onSuccess: () => {
      toast.success('Penugasan petugas berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['site-officers', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site-roster', siteId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus penugasan');
    },
  });

  const officers = officersData?.data || [];

  const handleOpenAssign = () => {
    setOfficerToEdit(null);
    setIsAssignModalOpen(true);
  };

  const handleOpenEdit = (officer: SiteOfficer) => {
    setOfficerToEdit(officer);
    setIsAssignModalOpen(true);
  };

  const formatWorkDays = (days?: number[] | null) => {
    if (!days || days.length === 0) return '';
    const dayMap: Record<number, string> = {
      1: 'Sen',
      2: 'Sel',
      3: 'Rab',
      4: 'Kam',
      5: 'Jum',
      6: 'Sab',
      7: 'Min',
    };
    return days.map((d) => dayMap[d] || d).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Site sub-navigation tabs */}
      <SiteNavigationTabs siteId={siteId} />

      {/* Action header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            Daftar Petugas & Penugasan Jadwal
          </h2>
          <p className="text-xs text-slate-500">
            Kelola satpam lapangan yang bertugas, tentukan tim roster bergilir atau jam kerja tetap.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsMasterShiftModalOpen(true)}
            className="text-xs"
          >
            <Clock className="h-4 w-4 mr-1.5" />
            Master Shift
          </Button>

          <Button onClick={handleOpenAssign} className="text-xs font-semibold">
            <UserPlus className="h-4 w-4 mr-1.5" />
            Tugaskan Petugas
          </Button>
        </div>
      </div>

      {/* Officers Table Card */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Petugas Terdaftar di Situs</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : officers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <p>Belum ada petugas yang ditugaskan ke situs ini.</p>
              <Button size="sm" onClick={handleOpenAssign} className="text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Tugaskan Petugas Sekarang
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Petugas</TableHead>
                    <TableHead>NIK / ID</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Model Jadwal</TableHead>
                    <TableHead>Shift Hari Ini</TableHead>
                    <TableHead>Pangkalan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {officers.map((officer) => (
                    <TableRow key={officer.id}>
                      {/* Name */}
                      <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {officer.user?.name || '-'}
                      </TableCell>

                      {/* Employee ID */}
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {officer.user?.employeeId || '-'}
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {officer.user?.role || 'OFFICER'}
                        </Badge>
                      </TableCell>

                      {/* Schedule Type / Model */}
                      <TableCell className="text-xs">
                        {officer.scheduleType === 'ROSTER' ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {officer.rosterTeam?.name || officer.rosterTeam?.code || 'Tim Roster'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kode: {officer.rosterTeam?.code || '-'}
                            </span>
                          </div>
                        ) : officer.scheduleType === 'FIXED' ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {officer.shift?.name || 'Jam Kerja Tetap'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Hari: {formatWorkDays(officer.workDays)}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-normal text-slate-500">
                            Belum Ditentukan
                          </Badge>
                        )}
                      </TableCell>

                      {/* Today's Shift */}
                      <TableCell className="text-xs font-medium">
                        {officer.isOffDay ? (
                          <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                            <Coffee className="h-3 w-3" />
                            Libur Dinas (OFF)
                          </span>
                        ) : officer.todayShift ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                            <Clock className="h-3 w-3 text-blue-600" />
                            {officer.todayShift.name}
                            {officer.todayShift.startTime && (
                              <span className="font-mono text-[10px] text-slate-400">
                                ({officer.todayShift.startTime.slice(0, 5)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </TableCell>

                      {/* Primary site base */}
                      <TableCell className="text-xs">
                        {officer.primary ? (
                          <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Utama
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sekunder</span>
                        )}
                      </TableCell>

                      {/* Active status */}
                      <TableCell>
                        <Badge variant={officer.active ? 'aman' : 'secondary'} className="text-[10px]">
                          {officer.active ? 'AKTIF' : 'NONAKTIF'}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Jadwal & Penugasan"
                            onClick={() => handleOpenEdit(officer)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Hapus Penugasan"
                            onClick={() => {
                              if (confirm(`Hapus penugasan ${officer.user?.name} dari situs ini?`)) {
                                removeMutation.mutate(officer.userId);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Pagination meta={officersData?.pagination} onPageChange={setPage} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Assign or Edit Officer Modal */}
      <AssignOfficerModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        siteId={siteId}
        officerToEdit={officerToEdit}
        onOpenCreateTeamModal={() => setIsCreateTeamModalOpen(true)}
      />

      {/* Master Shifts Preview / Creation Modal */}
      <MasterShiftModal
        isOpen={isMasterShiftModalOpen}
        onClose={() => setIsMasterShiftModalOpen(false)}
        siteId={siteId}
      />

      {/* Create Team Modal shortcut */}
      <RosterTeamFormModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        siteId={siteId}
      />
    </div>
  );
}
