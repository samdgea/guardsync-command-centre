'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi } from '@/features/shifts/api';
import { RosterTeam } from '@/types/shift';
import { SiteNavigationTabs } from '@/components/sites/SiteNavigationTabs';
import { RosterTeamFormModal } from '@/components/sites/RosterTeamFormModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Users,
  Calendar,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SiteRosterTeamsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const siteId = params.siteId as string;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<RosterTeam | null>(null);

  const { data: teamsData, isLoading, error } = useQuery({
    queryKey: ['roster-teams', siteId],
    queryFn: () => shiftsApi.getRosterTeams(siteId),
    enabled: !!siteId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shiftsApi.deleteRosterTeam(siteId, id),
    onSuccess: () => {
      toast.success('Tim roster berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['roster-teams', siteId] });
      queryClient.invalidateQueries({ queryKey: ['teams-dropdown', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site-officers', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site-roster', siteId] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err.message || 'Gagal menghapus tim roster'
      );
    },
  });

  const teams = teamsData?.data || [];

  const handleOpenCreate = () => {
    setTeamToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (team: RosterTeam) => {
    setTeamToEdit(team);
    setIsModalOpen(true);
  };

  const handleDelete = (team: RosterTeam) => {
    if (
      confirm(
        `Hapus tim "${team.name}" (${team.code})? Petugas yang tergabung di tim ini akan kehilangan jadwal rotasi.`
      )
    ) {
      deleteMutation.mutate(team.id);
    }
  };

  const formatShiftBadge = (code: string) => {
    const isOff = code.includes('OFF') || code.includes('LIBUR');
    const isPagi = code.includes('PAGI');
    const isSiang = code.includes('SIANG');
    const isMalam = code.includes('MALAM');
    const isNormal = code.includes('NORMAL');

    let badgeClass = 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200';
    let label = code.replace('DEFAULT_', '').replace('SHIFT_', '');

    if (isOff) {
      badgeClass = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
      label = 'LIBUR';
    } else if (isPagi) {
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
      label = 'PAGI';
    } else if (isSiang) {
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300';
      label = 'SIANG';
    } else if (isMalam) {
      badgeClass = 'bg-indigo-900 text-slate-100 border-indigo-700 dark:bg-slate-900 dark:text-slate-100';
      label = 'MALAM';
    } else if (isNormal) {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300';
      label = 'NORMAL';
    }

    return (
      <span
        className={cn(
          'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded border',
          badgeClass
        )}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <SiteNavigationTabs siteId={siteId} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Layers className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            Manajemen Tim Roster & Pola Siklus Shift
          </h2>
          <p className="text-xs text-slate-500">
            Definisikan kelompok kerja satpam (misal Tim Alpha, Tim Bravo) beserta urutan giliran shift dan tanggal acuan awal.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="text-xs font-semibold">
          <Plus className="h-4 w-4 mr-1.5" />
          Tambah Tim Roster
        </Button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20">
          <CardContent className="p-6 text-center text-xs text-red-600 dark:text-red-400">
            Gagal memuat data tim roster situs ini.
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        /* Empty State mandated by docs */
        <Card className="border-dashed border-2">
          <CardContent className="p-10 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Layers className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Belum ada Tim Roster yang dibuat untuk site ini
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Site ini belum memiliki kelompok tim roster kustom. Klik tombol "Tambah Tim Roster" untuk mulai membuat pola rotasi kerja berulang.
              </p>
            </div>
            <Button onClick={handleOpenCreate} className="text-xs font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Tambah Tim Roster Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="relative overflow-hidden hover:shadow-sm transition">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900">
                      {team.code}
                    </span>
                    <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {team.name}
                    </CardTitle>
                  </div>
                  <Badge variant={team.active ? 'aman' : 'secondary'} className="text-[10px]">
                    {team.active ? 'AKTIF' : 'NONAKTIF'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>Anggota:</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      {team.assignmentsCount ?? 0} Petugas
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Acuan Mulai:</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      {team.patternStartDate || '-'}
                    </strong>
                  </div>
                </div>

                {/* Shift pattern sequence chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Urutan Siklus ({team.shiftPattern?.length || 0} Hari):</span>
                    <span className="text-[10px] text-slate-400">Berputar tak terbatas</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                    {team.shiftPattern && team.shiftPattern.length > 0 ? (
                      team.shiftPattern.map((code, idx) => (
                        <React.Fragment key={idx}>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-slate-400 font-mono">H{idx + 1}:</span>
                            {formatShiftBadge(code)}
                          </div>
                          {idx < team.shiftPattern.length - 1 && (
                            <ArrowRight className="h-2.5 w-2.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Pola giliran kosong</span>
                    )}
                  </div>
                </div>

                {/* Actions footer */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(team)}
                    className="text-xs h-8"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit Tim & Pola
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(team)}
                    disabled={deleteMutation.isPending}
                    className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Roster Team Form Modal */}
      <RosterTeamFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        siteId={siteId}
        teamToEdit={teamToEdit}
      />
    </div>
  );
}
