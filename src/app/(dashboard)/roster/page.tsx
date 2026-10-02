'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi } from '@/features/shifts/api';
import { sitesApi } from '@/features/sites/api';
import { useAuthStore } from '@/stores/authStore';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { Shift, RosterTeam, SiteRosterScheduleItem } from '@/types/shift';
import { Site } from '@/types/site';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ShiftFormModal } from '@/components/shifts/ShiftFormModal';
import { ShiftDeleteDialog } from '@/components/shifts/ShiftDeleteDialog';
import { RosterTeamFormModal } from '@/components/sites/RosterTeamFormModal';
import {
  CalendarClock,
  Clock,
  Layers,
  Calendar,
  Plus,
  Search,
  Edit,
  Edit2,
  Trash2,
  Building2,
  Sun,
  Moon,
  Coffee,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Info,
  SlidersHorizontal,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Globe,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type RosterTabType = 'shifts' | 'teams' | 'matrix';

export default function AdminRosterManagementPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { selectedSiteId, setSelectedSiteId, sitesList, setSitesList } = useSiteContextStore();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<RosterTabType>('shifts');

  // Allowed sites for regular ADMIN or SUPER_ADMIN
  const assignedSites = useMemo(() => {
    if (isSuperAdmin) {
      return sitesList;
    }
    const assignments = user?.assignments || [];
    return assignments.map((a) => {
      const match = sitesList.find((s) => s.id === (a.siteId || a.id));
      if (match) return match;
      return {
        id: a.siteId || a.id,
        name: a.name || a.site?.name || 'Situs Penugasan',
        code: a.code || a.site?.code || 'SITE',
        active: true,
      } as Site;
    });
  }, [isSuperAdmin, sitesList, user?.assignments]);

  // Determine current active siteId
  const activeSiteId = useMemo(() => {
    if (selectedSiteId && assignedSites.some((s) => s.id === selectedSiteId)) {
      return selectedSiteId;
    }
    if (assignedSites.length > 0) {
      return assignedSites[0].id;
    }
    return '';
  }, [selectedSiteId, assignedSites]);

  // Synchronize site selection if not yet set
  useEffect(() => {
    if (activeSiteId && selectedSiteId !== activeSiteId) {
      setSelectedSiteId(activeSiteId);
    }
  }, [activeSiteId, selectedSiteId, setSelectedSiteId]);

  // Get active site detail object
  const currentSite = useMemo(() => {
    return assignedSites.find((s) => s.id === activeSiteId);
  }, [assignedSites, activeSiteId]);

  // Fetch full sites list if needed
  const { data: sitesData } = useQuery({
    queryKey: ['sites', 'roster-sites-lookup'],
    queryFn: () => sitesApi.getSites({ limit: 100 }),
    enabled: isSuperAdmin && sitesList.length === 0,
  });

  useEffect(() => {
    if (sitesData?.data && sitesList.length === 0) {
      setSitesList(sitesData.data);
    }
  }, [sitesData, sitesList.length, setSitesList]);

  // -------------------------------------------------------------
  // TAB 1: MASTER SHIFT STATES & LOGIC
  // -------------------------------------------------------------
  const [shiftSearchQuery, setShiftSearchQuery] = useState('');
  const [shiftScopeFilter, setShiftScopeFilter] = useState<'ALL' | 'GLOBAL' | 'SITE'>('ALL');
  const [shiftActiveOnly, setShiftActiveOnly] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isShiftDeleteDialogOpen, setIsShiftDeleteDialogOpen] = useState(false);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);

  const {
    data: shiftsData,
    isLoading: isShiftsLoading,
    isError: isShiftsError,
    error: shiftsError,
    refetch: refetchShifts,
  } = useQuery({
    queryKey: ['shifts-roster-page', activeSiteId, shiftActiveOnly],
    queryFn: () =>
      shiftsApi.getShifts({
        siteId: activeSiteId || undefined,
        activeOnly: shiftActiveOnly ? true : undefined,
      }),
    enabled: !!activeSiteId,
  });

  const rawShifts: Shift[] = shiftsData?.data || [];

  const filteredShifts = useMemo(() => {
    return rawShifts.filter((shift) => {
      const isShiftGlobal = shift.siteId === null || shift.siteId === undefined;
      if (shiftScopeFilter === 'GLOBAL' && !isShiftGlobal) return false;
      if (shiftScopeFilter === 'SITE' && isShiftGlobal) return false;

      if (shiftSearchQuery.trim()) {
        const q = shiftSearchQuery.toLowerCase().trim();
        const codeMatch = shift.code?.toLowerCase().includes(q);
        const nameMatch = shift.name?.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch) return false;
      }
      return true;
    });
  }, [rawShifts, shiftScopeFilter, shiftSearchQuery]);

  const shiftsTotalCount = rawShifts.length;
  const shiftsGlobalCount = rawShifts.filter((s) => s.siteId === null || s.siteId === undefined).length;
  const shiftsSiteCount = rawShifts.filter((s) => s.siteId !== null && s.siteId !== undefined).length;
  const shiftsActiveCount = rawShifts.filter((s) => s.active !== false).length;

  const canManageShift = (shift: Shift): boolean => {
    const isShiftGlobal = shift.siteId === null || shift.siteId === undefined;
    if (isSuperAdmin) return true;
    if (isShiftGlobal) return false;
    return shift.siteId === activeSiteId;
  };

  const handleOpenCreateShift = () => {
    setEditingShift(null);
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setIsShiftModalOpen(true);
  };

  const handleOpenDeleteShift = (shift: Shift) => {
    setDeletingShift(shift);
    setIsShiftDeleteDialogOpen(true);
  };

  // -------------------------------------------------------------
  // TAB 2: TIM ROSTER STATES & LOGIC
  // -------------------------------------------------------------
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<RosterTeam | null>(null);

  const {
    data: teamsData,
    isLoading: isTeamsLoading,
    isError: isTeamsError,
    error: teamsError,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: ['roster-teams', activeSiteId],
    queryFn: () => shiftsApi.getRosterTeams(activeSiteId),
    enabled: !!activeSiteId,
  });

  const teams = teamsData?.data || [];

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => shiftsApi.deleteRosterTeam(activeSiteId, id),
    onSuccess: () => {
      toast.success('Tim roster berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['roster-teams', activeSiteId] });
      queryClient.invalidateQueries({ queryKey: ['site-roster', activeSiteId] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err.message || 'Gagal menghapus tim roster'
      );
    },
  });

  const handleOpenCreateTeam = () => {
    setTeamToEdit(null);
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeam = (team: RosterTeam) => {
    setTeamToEdit(team);
    setIsTeamModalOpen(true);
  };

  const handleDeleteTeam = (team: RosterTeam) => {
    if (
      confirm(
        `Hapus tim "${team.name}" (${team.code})? Petugas yang tergabung di tim ini akan kehilangan jadwal rotasi.`
      )
    ) {
      deleteTeamMutation.mutate(team.id);
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

  // -------------------------------------------------------------
  // TAB 3: MATRIKS JADWAL STATES & LOGIC
  // -------------------------------------------------------------
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [matrixStartDate, setMatrixStartDate] = useState(todayStr);
  const [matrixDays, setMatrixDays] = useState(14);
  const [selectedCellItem, setSelectedCellItem] = useState<{
    officerName: string;
    item: SiteRosterScheduleItem;
  } | null>(null);

  const {
    data: rosterMatrixData,
    isLoading: isMatrixLoading,
    isError: isMatrixError,
    refetch: refetchMatrix,
  } = useQuery({
    queryKey: ['site-roster-admin-view', activeSiteId, matrixStartDate, matrixDays],
    queryFn: () =>
      shiftsApi.getSiteRoster({
        siteId: activeSiteId,
        startDate: matrixStartDate,
        days: matrixDays,
      }),
    enabled: !!activeSiteId && activeTab === 'matrix',
  });

  const rosterOfficers = rosterMatrixData?.roster || [];

  const scheduleDates = useMemo(() => {
    if (rosterOfficers.length > 0 && rosterOfficers[0].schedule.length > 0) {
      return rosterOfficers[0].schedule.map((s) => ({
        date: s.date,
        dayOfWeek: s.dayOfWeek,
        dayName: s.dayName,
      }));
    }
    return [];
  }, [rosterOfficers]);

  const dailySummary = useMemo(() => {
    const summary: Record<
      string,
      { pagi: number; siang: number; malam: number; normal: number; off: number; unassigned: number }
    > = {};

    scheduleDates.forEach((d) => {
      summary[d.date] = { pagi: 0, siang: 0, malam: 0, normal: 0, off: 0, unassigned: 0 };
    });

    rosterOfficers.forEach((off) => {
      if (off.schedule.length === 0) return;
      off.schedule.forEach((s) => {
        if (!summary[s.date]) return;
        if (s.isOffDay || s.shift?.isOff) {
          summary[s.date].off += 1;
        } else if (s.shift?.code?.includes('PAGI') || s.shift?.name?.toLowerCase().includes('pagi')) {
          summary[s.date].pagi += 1;
        } else if (s.shift?.code?.includes('SIANG') || s.shift?.name?.toLowerCase().includes('siang')) {
          summary[s.date].siang += 1;
        } else if (s.shift?.code?.includes('MALAM') || s.shift?.isOvernight) {
          summary[s.date].malam += 1;
        } else if (s.shift) {
          summary[s.date].normal += 1;
        } else {
          summary[s.date].unassigned += 1;
        }
      });
    });

    return summary;
  }, [rosterOfficers, scheduleDates]);

  const handleShiftPeriod = (direction: 'prev' | 'next') => {
    const current = new Date(matrixStartDate);
    const offset = direction === 'prev' ? -matrixDays : matrixDays;
    current.setDate(current.getDate() + offset);
    setMatrixStartDate(current.toISOString().split('T')[0]);
  };

  const handleResetToToday = () => {
    setMatrixStartDate(todayStr);
  };

  const formatDayNameIndo = (dayOfWeek: number) => {
    const indoDays: Record<number, string> = {
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
      7: 'Minggu',
    };
    return indoDays[dayOfWeek] || '';
  };

  const renderShiftCell = (
    item: SiteRosterScheduleItem | undefined,
    officerName: string
  ) => {
    if (!item || (!item.shift && !item.isOffDay)) {
      return (
        <span
          className="inline-block w-full py-1 text-[10px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded text-center select-none"
          title="Belum ada jadwal"
        >
          -
        </span>
      );
    }

    if (item.isOffDay || item.shift?.isOff) {
      return (
        <button
          type="button"
          onClick={() => setSelectedCellItem({ officerName, item })}
          className="w-full py-1 px-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 transition hover:opacity-80 text-center"
        >
          LIBUR
        </button>
      );
    }

    const s = item.shift;
    if (!s) return null;

    let cellClass = 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200';
    let shortName = s.code.replace('DEFAULT_', '').replace('SHIFT_', '');

    if (s.code.includes('PAGI') || s.name.toLowerCase().includes('pagi')) {
      cellClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      shortName = 'PAGI';
    } else if (s.code.includes('SIANG') || s.name.toLowerCase().includes('siang')) {
      cellClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
      shortName = 'SIANG';
    } else if (s.code.includes('MALAM') || s.isOvernight) {
      cellClass = 'bg-indigo-900 text-slate-100 border-indigo-700 dark:bg-slate-900 dark:text-slate-100';
      shortName = 'MALAM';
    } else if (s.code.includes('NORMAL') || s.name.toLowerCase().includes('normal')) {
      cellClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
      shortName = 'NORMAL';
    }

    return (
      <button
        type="button"
        onClick={() => setSelectedCellItem({ officerName, item })}
        className={cn(
          'w-full py-1 px-1 rounded text-[10px] font-semibold border transition hover:opacity-80 text-center shadow-xs',
          cellClass
        )}
      >
        <span>{shortName}</span>
      </button>
    );
  };

  // -------------------------------------------------------------
  // GUARD: Jika belum ada situs yang terhubung
  // -------------------------------------------------------------
  if (!activeSiteId && assignedSites.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <Building2 className="h-10 w-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Belum Ada Situs Penugasan
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Akun Anda belum memiliki situs penugasan aktif. Hubungi Super Administrator untuk mendaftarkan situs penugasan Anda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <CalendarClock className="h-6 w-6 text-slate-700 dark:text-slate-300" />
              Manajemen Roster & Jadwal
            </h1>
            {currentSite && (
              <Badge variant="outline" className="text-xs font-mono font-semibold">
                {currentSite.code}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pusat konfigurasi shift operasional, perputaran tim roster, dan kalender matriks giliran dinas satpam.
          </p>
        </div>

        {/* Site Context Selector for multi-site admin */}
        <div className="flex items-center gap-2">
          {assignedSites.length > 1 ? (
            <div className="flex items-center gap-2">
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
          ) : currentSite ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-xs">
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-slate-500">Situs:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                {currentSite.name}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Roster Tabs">
          {/* Tab 1: Master Shift */}
          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            className={cn(
              'group inline-flex items-center py-2.5 px-3 border-b-2 text-xs font-medium transition-colors shrink-0',
              activeTab === 'shifts'
                ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Clock
              className={cn(
                'mr-2 h-4 w-4',
                activeTab === 'shifts'
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-400 group-hover:text-slate-600'
              )}
            />
            <span>Master Shift Kerja</span>
            <span className="ml-2 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
              {filteredShifts.length}
            </span>
          </button>

          {/* Tab 2: Tim Roster */}
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={cn(
              'group inline-flex items-center py-2.5 px-3 border-b-2 text-xs font-medium transition-colors shrink-0',
              activeTab === 'teams'
                ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Layers
              className={cn(
                'mr-2 h-4 w-4',
                activeTab === 'teams'
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-400 group-hover:text-slate-600'
              )}
            />
            <span>Tim Roster & Pola Siklus</span>
            <span className="ml-2 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
              {teams.length}
            </span>
          </button>

          {/* Tab 3: Matriks Jadwal */}
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={cn(
              'group inline-flex items-center py-2.5 px-3 border-b-2 text-xs font-medium transition-colors shrink-0',
              activeTab === 'matrix'
                ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Calendar
              className={cn(
                'mr-2 h-4 w-4',
                activeTab === 'matrix'
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-400 group-hover:text-slate-600'
              )}
            />
            <span>Matriks Kalender Jadwal</span>
          </button>
        </nav>
      </div>

      {/* ============================================================= */}
      {/* TAB 1 CONTENT: MASTER SHIFT KERJA                             */}
      {/* ============================================================= */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Action Header & Quick Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                Master Shift Operasional Situs
              </h2>
              <p className="text-xs text-slate-500">
                Shift standar nasional (Global) dan shift kustom khusus situs {currentSite?.name || ''}.
              </p>
            </div>

            <Button onClick={handleOpenCreateShift} className="text-xs font-semibold h-9">
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah Shift Kustom Site
            </Button>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Shift</span>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {isShiftsLoading ? <Skeleton className="h-7 w-12" /> : shiftsTotalCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Berlaku di situs ini</div>
            </div>

            <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Shift Global</span>
                <Globe className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {isShiftsLoading ? <Skeleton className="h-7 w-12" /> : shiftsGlobalCount}
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Standar pusat</div>
            </div>

            <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Shift Kustom Site</span>
                <Building2 className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {isShiftsLoading ? <Skeleton className="h-7 w-12" /> : shiftsSiteCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Khusus lokasi ini</div>
            </div>

            <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Status Aktif</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {isShiftsLoading ? <Skeleton className="h-7 w-12" /> : shiftsActiveCount}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Siap digunakan</div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filter & Pencarian Shift</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari kode atau nama shift..."
                  value={shiftSearchQuery}
                  onChange={(e) => setShiftSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              <div>
                <select
                  value={shiftScopeFilter}
                  onChange={(e) => setShiftScopeFilter(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ALL">Semua Cakupan</option>
                  <option value="GLOBAL">Hanya Shift Global (Nasional)</option>
                  <option value="SITE">Hanya Shift Kustom Situs</option>
                </select>
              </div>

              <div className="flex items-center gap-2 px-2">
                <input
                  type="checkbox"
                  id="activeOnlyCheckShift"
                  checked={shiftActiveOnly}
                  onChange={(e) => setShiftActiveOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
                />
                <label
                  htmlFor="activeOnlyCheckShift"
                  className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium select-none"
                >
                  Hanya Shift Aktif
                </label>
              </div>
            </div>
          </div>

          {/* Table / List */}
          {isShiftsError ? (
            <div className="p-8 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Gagal Memuat Master Shift
                </div>
                <p className="text-xs text-red-700 dark:text-red-300 max-w-md mx-auto">
                  {(shiftsError as any)?.response?.data?.message ||
                    (shiftsError as any)?.message ||
                    'Terjadi kendala saat mengambil data shift dari server.'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => refetchShifts()} className="text-xs">
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Coba Lagi
              </Button>
            </div>
          ) : isShiftsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <Clock className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Tidak Ada Data Master Shift
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {shiftSearchQuery || shiftScopeFilter !== 'ALL' || shiftActiveOnly
                    ? 'Tidak ada shift yang cocok dengan filter atau kata kunci pencarian.'
                    : 'Belum ada data shift yang ditambahkan untuk situs ini.'}
                </p>
              </div>
              <Button size="sm" onClick={handleOpenCreateShift} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Shift Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px]">Shift Kerja</TableHead>
                      <TableHead>Cakupan</TableHead>
                      <TableHead>Jam Operasional</TableHead>
                      <TableHead>Karakteristik</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShifts.map((shift) => {
                      const isGlobalShift = shift.siteId === null || shift.siteId === undefined;
                      const canManage = canManageShift(shift);

                      return (
                        <TableRow key={shift.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                {shift.isOff ? (
                                  <Coffee className="h-4 w-4 text-slate-400" />
                                ) : shift.isOvernight ? (
                                  <Moon className="h-4 w-4 text-indigo-500" />
                                ) : (
                                  <Sun className="h-4 w-4 text-amber-500" />
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                                  {shift.name}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {shift.code}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {isGlobalShift ? (
                              <Badge variant="secondary" className="text-[10px] py-0 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900">
                                <Globe className="h-3 w-3 mr-1" />
                                Global (Nasional)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 font-medium">
                                <Building2 className="h-3 w-3 mr-1 text-slate-500" />
                                Kustom Site
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            {shift.isOff ? (
                              <span className="text-xs text-slate-400 italic font-medium">
                                Libur Dinas (OFF)
                              </span>
                            ) : (
                              <div className="space-y-0.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                                <div>
                                  {shift.startTime?.slice(0, 5)} - {shift.endTime?.slice(0, 5)} WIB
                                </div>
                                <div className="text-[10px] font-sans text-slate-400">
                                  Toleransi: {shift.lateToleranceMinutes ?? 15} mnt
                                </div>
                              </div>
                            )}
                          </TableCell>

                          <TableCell>
                            {shift.isOff ? (
                              <Badge variant="outline" className="text-[10px] text-slate-500">
                                Libur
                              </Badge>
                            ) : shift.isOvernight ? (
                              <Badge variant="outline" className="text-[10px] text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900">
                                <Moon className="h-2.5 w-2.5 mr-1" />
                                Lintas Malam
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900">
                                <Sun className="h-2.5 w-2.5 mr-1" />
                                Hari Sama
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            {shift.active !== false ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">
                                Nonaktif
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            {canManage ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditShift(shift)}
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                                  title="Ubah Shift"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  <span className="sr-only">Ubah Shift</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDeleteShift(shift)}
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                  title="Hapus Shift"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="sr-only">Hapus Shift</span>
                                </Button>
                              </div>
                            ) : (
                              <span
                                className="text-[10px] text-slate-400 italic"
                                title="Shift global hanya dapat dikelola oleh Super Admin"
                              >
                                Hanya Baca
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (Shown on screens smaller than md) */}
              <div className="md:hidden space-y-3">
                {filteredShifts.map((shift) => {
                  const isGlobalShift = shift.siteId === null || shift.siteId === undefined;
                  const canManage = canManageShift(shift);

                  return (
                    <div
                      key={shift.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            {shift.isOff ? (
                              <Coffee className="h-4 w-4 text-slate-400" />
                            ) : shift.isOvernight ? (
                              <Moon className="h-4 w-4 text-indigo-500" />
                            ) : (
                              <Sun className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                              {shift.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {shift.code}
                            </span>
                          </div>
                        </div>

                        <div>
                          {shift.active !== false ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-400">
                              Nonaktif
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Cakupan</span>
                          {isGlobalShift ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              Global (Nasional)
                            </span>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate block">
                              Kustom Site
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">Jam Operasional</span>
                          {shift.isOff ? (
                            <span className="text-slate-400 italic">Libur Dinas</span>
                          ) : (
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                              {shift.startTime?.slice(0, 5)} - {shift.endTime?.slice(0, 5)} WIB
                            </span>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditShift(shift)}
                            className="text-xs h-9 px-3"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Ubah
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDeleteShift(shift)}
                            className="text-xs h-9 px-3 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Hapus
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Modal for Create & Edit */}
          <ShiftFormModal
            isOpen={isShiftModalOpen}
            onClose={() => setIsShiftModalOpen(false)}
            initialData={editingShift}
            defaultSiteId={activeSiteId}
            availableSites={assignedSites}
            onSuccess={() => refetchShifts()}
          />

          {/* Delete Confirmation Dialog */}
          <ShiftDeleteDialog
            isOpen={isShiftDeleteDialogOpen}
            onClose={() => setIsShiftDeleteDialogOpen(false)}
            shift={deletingShift}
            onSuccess={() => refetchShifts()}
          />
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2 CONTENT: TIM ROSTER & POLA SIKLUS                       */}
      {/* ============================================================= */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Layers className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                Manajemen Tim Roster & Pola Siklus Shift
              </h2>
              <p className="text-xs text-slate-500">
                Definisikan regu kerja satpam (misal Tim Alpha, Bravo) beserta urutan giliran shift dan tanggal acuan awal.
              </p>
            </div>

            <Button onClick={handleOpenCreateTeam} className="text-xs font-semibold h-9">
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah Tim Roster
            </Button>
          </div>

          {isTeamsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>
          ) : isTeamsError ? (
            <Card className="border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20">
              <CardContent className="p-6 text-center text-xs text-red-600 dark:text-red-400 space-y-2">
                <div>Gagal memuat data tim roster situs ini.</div>
                <Button size="sm" variant="outline" onClick={() => refetchTeams()} className="text-xs">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Coba Lagi
                </Button>
              </CardContent>
            </Card>
          ) : teams.length === 0 ? (
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
                    Situs ini belum memiliki kelompok tim roster. Klik tombol Tambah Tim Roster untuk mulai membuat pola rotasi kerja berulang.
                  </p>
                </div>
                <Button onClick={handleOpenCreateTeam} className="text-xs font-semibold">
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
                              {idx < (team.shiftPattern?.length || 0) - 1 && (
                                <ArrowRight className="h-2.5 w-2.5 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                            </React.Fragment>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pola giliran kosong</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditTeam(team)}
                        className="text-xs h-8"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit Tim & Pola
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTeam(team)}
                        disabled={deleteTeamMutation.isPending}
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
            isOpen={isTeamModalOpen}
            onClose={() => setIsTeamModalOpen(false)}
            siteId={activeSiteId}
            teamToEdit={teamToEdit}
            onSuccess={() => refetchTeams()}
          />
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3 CONTENT: MATRIKS JADWAL                                 */}
      {/* ============================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                Matriks Kalender Giliran Shift Situs
              </h2>
              <p className="text-xs text-slate-500">
                Pantau sebaran penugasan satpam di seluruh pos per hari berdasarkan perputaran tim roster dan jam tetap.
              </p>
            </div>

            {/* Date Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md shadow-xs" role="group">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMatrixDays(d)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold border first:rounded-l-md last:rounded-r-md transition',
                      matrixDays === d
                        ? 'bg-slate-900 text-slate-50 border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                    )}
                  >
                    {d} Hari
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleShiftPeriod('prev')}
                  title="Periode Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Input
                  type="date"
                  value={matrixStartDate}
                  onChange={(e) => setMatrixStartDate(e.target.value)}
                  className="h-8 text-xs font-mono w-36"
                />

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleShiftPeriod('next')}
                  title="Periode Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {matrixStartDate !== todayStr && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToToday}
                    className="text-xs h-8 px-2 text-blue-600"
                  >
                    Hari Ini
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Legend Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> Keterangan:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-blue-100 border border-blue-300 dark:bg-blue-900" />
              <span>Pagi (07:00 - 15:00)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-purple-100 border border-purple-300 dark:bg-purple-900" />
              <span>Siang (15:00 - 23:00)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-indigo-900 border border-indigo-700" />
              <span>Malam (23:00 - 07:00)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-emerald-100 border border-emerald-300 dark:bg-emerald-900" />
              <span>Normal (07:00 - 17:00)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-slate-200 border border-slate-300 dark:bg-slate-800" />
              <span>Libur (OFF)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-dashed border-slate-400" />
              <span>Belum Ditentukan</span>
            </div>
          </div>

          {/* Matrix Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {isMatrixLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : isMatrixError ? (
                <div className="p-10 text-center text-xs text-red-600 space-y-2">
                  <div>Gagal memuat matriks kalender jadwal situs.</div>
                  <Button size="sm" variant="outline" onClick={() => refetchMatrix()} className="text-xs">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Coba Lagi
                  </Button>
                </div>
              ) : rosterOfficers.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Belum ada data jadwal petugas untuk rentang waktu ini.
                  </p>
                  <p>
                    Pastikan sudah ada petugas yang ditugaskan ke site ini dengan model Tim Roster atau Jam Kerja Tetap.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                        <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900/90 py-3 px-3 min-w-[200px] border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
                          Petugas Lapangan
                        </th>

                        <th className="sticky left-[200px] z-20 bg-slate-50 dark:bg-slate-900/90 py-3 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
                          Model / Tim
                        </th>

                        {scheduleDates.map((d) => {
                          const isToday = d.date === todayStr;
                          const isWeekend = d.dayOfWeek === 6 || d.dayOfWeek === 7;
                          return (
                            <th
                              key={d.date}
                              className={cn(
                                'py-2 px-2 text-center min-w-[80px] border-r border-slate-200 dark:border-slate-800',
                                isWeekend && 'bg-slate-100/60 dark:bg-slate-800/40',
                                isToday && 'bg-blue-50/80 dark:bg-blue-950/40 font-bold'
                              )}
                            >
                              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                                {formatDayNameIndo(d.dayOfWeek)}
                              </div>
                              <div
                                className={cn(
                                  'text-xs font-mono',
                                  isToday ? 'text-blue-600 font-bold' : 'text-slate-900 dark:text-slate-100'
                                )}
                              >
                                {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rosterOfficers.map((officer) => {
                        const scheduleMap = new Map<string, SiteRosterScheduleItem>();
                        officer.schedule.forEach((s) => scheduleMap.set(s.date, s));

                        return (
                          <tr key={officer.user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {officer.user.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                NIK: {officer.user.employeeId}
                              </div>
                            </td>

                            <td className="sticky left-[200px] z-10 bg-white dark:bg-slate-900 py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                              {officer.scheduleType === 'ROSTER' ? (
                                <span className="font-semibold text-[11px] text-blue-700 dark:text-blue-300">
                                  {officer.rosterTeam?.code || 'ROSTER'}
                                </span>
                              ) : officer.scheduleType === 'FIXED' ? (
                                <span className="font-semibold text-[11px] text-emerald-700 dark:text-emerald-300">
                                  Jam Tetap
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  Tanpa Jadwal
                                </span>
                              )}
                            </td>

                            {scheduleDates.map((d) => {
                              const item = scheduleMap.get(d.date);
                              const isWeekend = d.dayOfWeek === 6 || d.dayOfWeek === 7;
                              const isToday = d.date === todayStr;

                              return (
                                <td
                                  key={d.date}
                                  className={cn(
                                    'py-2 px-1.5 text-center border-r border-slate-100 dark:border-slate-800/80',
                                    isWeekend && 'bg-slate-50/40 dark:bg-slate-800/20',
                                    isToday && 'bg-blue-50/30 dark:bg-blue-950/20'
                                  )}
                                >
                                  {renderShiftCell(item, officer.user.name)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Headcount summary row */}
                      <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 font-semibold">
                        <td
                          colSpan={2}
                          className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/90 py-3 px-3 text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800"
                        >
                          <div className="font-bold">Total Petugas Dinas Harian</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            Rekapitulasi kesiapan jaga
                          </div>
                        </td>

                        {scheduleDates.map((d) => {
                          const stats = dailySummary[d.date];
                          const totalOnDuty =
                            (stats?.pagi || 0) +
                            (stats?.siang || 0) +
                            (stats?.malam || 0) +
                            (stats?.normal || 0);

                          return (
                            <td
                              key={d.date}
                              className="py-2 px-1 text-center border-r border-slate-200 dark:border-slate-800 text-[11px]"
                            >
                              <div className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                {totalOnDuty}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono">
                                OFF: {stats?.off || 0}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Cell Popover / Card */}
          {selectedCellItem && (
            <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Detail Jadwal: {selectedCellItem.officerName} ({selectedCellItem.item.date})
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {selectedCellItem.item.isOffDay || selectedCellItem.item.shift?.isOff ? (
                      <span>Petugas dijadwalkan Libur Dinas (OFF) pada hari ini.</span>
                    ) : (
                      <span>
                        Shift: <strong>{selectedCellItem.item.shift?.name}</strong> (
                        {selectedCellItem.item.shift?.startTime?.slice(0, 5)} -{' '}
                        {selectedCellItem.item.shift?.endTime?.slice(0, 5)} WIB). Toleransi
                        keterlambatan {selectedCellItem.item.shift?.lateToleranceMinutes ?? 15} menit.
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCellItem(null)}
                  className="text-xs self-start sm:self-center"
                >
                  Tutup
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
