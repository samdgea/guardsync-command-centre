'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi } from '@/features/shifts/api';
import { sitesApi } from '@/features/sites/api';
import { useAuthStore } from '@/stores/authStore';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { Shift } from '@/types/shift';
import { Site } from '@/types/site';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ShiftFormModal } from '@/components/shifts/ShiftFormModal';
import { ShiftDeleteDialog } from '@/components/shifts/ShiftDeleteDialog';
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Search,
  Globe,
  Building2,
  Moon,
  Sun,
  Coffee,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

export default function ShiftsPage() {
  const user = useAuthStore((s) => s.user);
  const { sitesList, setSitesList } = useSiteContextStore();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Filters state
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'GLOBAL' | 'SITE'>('ALL');
  const [activeOnly, setActiveOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);

  // Fetch sites list if not yet populated in store
  const { data: sitesData } = useQuery({
    queryKey: ['sites', 'shifts-filter'],
    queryFn: () => sitesApi.getSites({ limit: 100 }),
    enabled: isSuperAdmin,
  });

  React.useEffect(() => {
    if (sitesData?.data && sitesList.length === 0) {
      setSitesList(sitesData.data);
    }
  }, [sitesData, sitesList.length, setSitesList]);

  // Allowed sites for regular ADMIN
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

  // Query parameter siteId
  const querySiteId = useMemo(() => {
    if (isSuperAdmin) {
      if (selectedSiteFilter === 'ALL' || selectedSiteFilter === 'GLOBAL_ONLY') {
        return undefined;
      }
      return selectedSiteFilter;
    }
    // For regular ADMIN
    if (selectedSiteFilter !== 'ALL') {
      return selectedSiteFilter;
    }
    if (assignedSites.length === 1) {
      return assignedSites[0].id;
    }
    return undefined;
  }, [isSuperAdmin, selectedSiteFilter, assignedSites]);

  // Fetch shifts
  const {
    data: shiftsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['shifts-list', querySiteId, activeOnly],
    queryFn: () =>
      shiftsApi.getShifts({
        siteId: querySiteId,
        activeOnly: activeOnly ? true : undefined,
      }),
  });

  const rawShifts: Shift[] = shiftsData?.data || [];

  // Client-side filtering for scope & search
  const filteredShifts = useMemo(() => {
    return rawShifts.filter((shift) => {
      // Scope filter
      const isShiftGlobal = shift.siteId === null || shift.siteId === undefined;
      if (scopeFilter === 'GLOBAL' && !isShiftGlobal) return false;
      if (scopeFilter === 'SITE' && isShiftGlobal) return false;

      // Special Global only selection from site dropdown
      if (selectedSiteFilter === 'GLOBAL_ONLY' && !isShiftGlobal) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = shift.code?.toLowerCase().includes(q);
        const nameMatch = shift.name?.toLowerCase().includes(q);
        const siteNameMatch = shift.site?.name?.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !siteNameMatch) {
          return false;
        }
      }

      return true;
    });
  }, [rawShifts, scopeFilter, selectedSiteFilter, searchQuery]);

  // Metric counts
  const totalCount = rawShifts.length;
  const globalCount = rawShifts.filter((s) => s.siteId === null || s.siteId === undefined).length;
  const siteCount = rawShifts.filter((s) => s.siteId !== null && s.siteId !== undefined).length;
  const activeCount = rawShifts.filter((s) => s.active !== false).length;

  // Check if current user has permission to edit or delete a shift
  const canManageShift = (shift: Shift): boolean => {
    const isShiftGlobal = shift.siteId === null || shift.siteId === undefined;
    if (isSuperAdmin) return true;
    if (isShiftGlobal) return false; // Regular admin cannot modify global shift
    return assignedSites.some((s) => s.id === shift.siteId);
  };

  const handleOpenCreate = () => {
    setEditingShift(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift);
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (shift: Shift) => {
    setDeletingShift(shift);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Master Shift Kerja
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              {filteredShifts.length} Shift
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi jam operasional satpam, shift terpusat nasional, maupun shift kustom per situs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} className="text-xs font-semibold h-9">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Master Shift
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Shift</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {isLoading ? <Skeleton className="h-7 w-12" /> : totalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Semua data terdaftar</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Shift Global</span>
            <Globe className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {isLoading ? <Skeleton className="h-7 w-12" /> : globalCount}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Berlaku nasional</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Shift Situs</span>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {isLoading ? <Skeleton className="h-7 w-12" /> : siteCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Khusus lokasi tertentu</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Status Aktif</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {isLoading ? <Skeleton className="h-7 w-12" /> : activeCount}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari kode atau nama shift..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>

          {/* Site selection */}
          <div>
            {isSuperAdmin ? (
              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="ALL">Semua Situs & Global</option>
                <option value="GLOBAL_ONLY">Hanya Shift Global</option>
                {assignedSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.code})
                  </option>
                ))}
              </select>
            ) : assignedSites.length === 1 ? (
              <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="truncate">{assignedSites[0].name}</span>
                <Badge variant="outline" className="text-[10px] py-0 shrink-0">
                  {assignedSites[0].code}
                </Badge>
              </div>
            ) : (
              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="ALL">Semua Situs Penugasan</option>
                {assignedSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Scope filter */}
          <div>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as any)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">Semua Cakupan</option>
              <option value="GLOBAL">Hanya Shift Global</option>
              <option value="SITE">Hanya Shift Khusus Situs</option>
            </select>
          </div>

          {/* Active status filter */}
          <div className="flex items-center gap-2 px-2">
            <input
              type="checkbox"
              id="activeOnlyCheck"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
            />
            <label
              htmlFor="activeOnlyCheck"
              className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium select-none"
            >
              Hanya Shift Aktif
            </label>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isError ? (
        <div className="p-8 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-red-900 dark:text-red-200">
              Gagal Memuat Master Shift
            </div>
            <p className="text-xs text-red-700 dark:text-red-300 max-w-md mx-auto">
              {(error as any)?.response?.data?.message ||
                (error as any)?.message ||
                'Terjadi kendala saat mengambil data shift dari server.'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Coba Lagi
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
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
              {searchQuery || scopeFilter !== 'ALL' || activeOnly
                ? 'Tidak ada shift yang cocok dengan kriteria filter atau kata kunci pencarian.'
                : 'Belum ada data shift yang ditambahkan ke dalam sistem.'}
            </p>
          </div>
          {(searchQuery || scopeFilter !== 'ALL' || activeOnly) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setScopeFilter('ALL');
                setActiveOnly(false);
                setSelectedSiteFilter('ALL');
              }}
              className="text-xs"
            >
              Reset Filter
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Shift Kerja</TableHead>
                  <TableHead>Cakupan / Lokasi</TableHead>
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
                      {/* Name & Code */}
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

                      {/* Scope & Site */}
                      <TableCell>
                        {isGlobalShift ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px] py-0 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900">
                              <Globe className="h-3 w-3 mr-1" />
                              Global (Nasional)
                            </Badge>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                              {shift.site?.name || 'Situs Terdaftar'}
                            </span>
                            {shift.site?.code && (
                              <Badge variant="outline" className="text-[9px] py-0 font-mono">
                                {shift.site.code}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Time schedule */}
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

                      {/* Characteristic Badge */}
                      <TableCell>
                        <div className="flex items-center gap-1">
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
                        </div>
                      </TableCell>

                      {/* Status */}
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

                      {/* Actions */}
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(shift)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                              title="Ubah Shift"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span className="sr-only">Ubah Shift</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDelete(shift)}
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
                            title="Hanya Super Admin yang dapat mengelola shift global"
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
                          {shift.site?.name || 'Situs Terdaftar'}
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
                        onClick={() => handleOpenEdit(shift)}
                        className="text-xs h-8 px-3"
                      >
                        <Edit className="h-3 w-3 mr-1.5" />
                        Ubah
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDelete(shift)}
                        className="text-xs h-8 px-3 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1.5" />
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
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={editingShift}
        defaultSiteId={querySiteId}
        availableSites={assignedSites}
      />

      {/* Delete Confirmation Dialog */}
      <ShiftDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        shift={deletingShift}
      />
    </div>
  );
}
