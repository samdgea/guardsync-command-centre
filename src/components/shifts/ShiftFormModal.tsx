'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi } from '@/features/shifts/api';
import { useAuthStore } from '@/stores/authStore';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { Shift, CreateShiftPayload, UpdateShiftPayload } from '@/types/shift';
import { Site } from '@/types/site';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Globe,
  Building2,
  Moon,
  Sun,
  Coffee,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Shift | null;
  defaultSiteId?: string | null;
  availableSites?: Site[];
}

export function ShiftFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  defaultSiteId,
  availableSites,
}: ShiftFormModalProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const contextSitesList = useSiteContextStore((s) => s.sitesList);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isEditing = !!initialData;

  // Compute allowed sites for the current user
  const sites = useMemo(() => {
    if (availableSites && availableSites.length > 0) {
      return availableSites;
    }
    if (isSuperAdmin) {
      return contextSitesList;
    }
    const assignments = user?.assignments || [];
    return assignments.map((a) => {
      const match = contextSitesList.find((s) => s.id === (a.siteId || a.id));
      if (match) return match;
      return {
        id: a.siteId || a.id,
        name: a.name || a.site?.name || 'Situs Penugasan',
        code: a.code || a.site?.code || 'SITE',
        active: true,
      } as Site;
    });
  }, [availableSites, isSuperAdmin, contextSitesList, user?.assignments]);

  // Form states
  const [isGlobal, setIsGlobal] = useState<boolean>(false);
  const [siteId, setSiteId] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('16:00');
  const [lateTolerance, setLateTolerance] = useState<number>(15);
  const [isOff, setIsOff] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Check if current user is regular ADMIN trying to edit a global shift
  const isGlobalShiftLocked = isEditing && initialData?.siteId === null && !isSuperAdmin;

  // Initialize or reset form when opened or initialData changes
  useEffect(() => {
    if (!isOpen) {
      setFormError(null);
      return;
    }

    if (initialData) {
      const isShiftGlobal = initialData.siteId === null || initialData.siteId === undefined;
      setIsGlobal(isShiftGlobal);
      setSiteId(initialData.siteId || '');
      setCode(initialData.code || '');
      setName(initialData.name || '');
      setStartTime(initialData.startTime ? initialData.startTime.slice(0, 5) : '08:00');
      setEndTime(initialData.endTime ? initialData.endTime.slice(0, 5) : '16:00');
      setLateTolerance(initialData.lateToleranceMinutes ?? 15);
      setIsOff(!!initialData.isOff);
      setActive(initialData.active !== false);
    } else {
      // Create mode
      if (isSuperAdmin) {
        if (defaultSiteId) {
          setIsGlobal(false);
          setSiteId(defaultSiteId);
        } else {
          setIsGlobal(true);
          setSiteId('');
        }
      } else {
        setIsGlobal(false);
        const fallbackSiteId = defaultSiteId || (sites.length > 0 ? sites[0].id : '');
        setSiteId(fallbackSiteId);
      }
      setCode('');
      setName('');
      setStartTime('08:00');
      setEndTime('16:00');
      setLateTolerance(15);
      setIsOff(false);
      setActive(true);
    }
    setFormError(null);
  }, [isOpen, initialData, isSuperAdmin, defaultSiteId, sites]);

  // Overnight detection
  const isOvernight = useMemo(() => {
    if (isOff || !startTime || !endTime) return false;
    return endTime < startTime;
  }, [isOff, startTime, endTime]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);

      if (!name.trim()) {
        throw new Error('Nama shift wajib diisi');
      }

      if (!isGlobal && !siteId) {
        throw new Error('Silakan pilih situs operasional untuk shift ini');
      }

      const formattedStartTime = isOff
        ? null
        : startTime.length === 5
        ? `${startTime}:00`
        : startTime;

      const formattedEndTime = isOff
        ? null
        : endTime.length === 5
        ? `${endTime}:00`
        : endTime;

      const targetSiteId = isGlobal ? null : siteId;

      if (isEditing && initialData) {
        const updatePayload: UpdateShiftPayload = {
          name: name.trim(),
          siteId: targetSiteId,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          lateToleranceMinutes: isOff ? 0 : Number(lateTolerance),
          isOff,
          active,
        };
        if (code.trim()) {
          updatePayload.code = code.trim().toUpperCase();
        }
        return shiftsApi.updateShift(initialData.id, updatePayload);
      } else {
        const createPayload: CreateShiftPayload = {
          siteId: targetSiteId,
          name: name.trim(),
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          lateToleranceMinutes: isOff ? 0 : Number(lateTolerance),
          isOff,
          active,
        };
        if (code.trim()) {
          createPayload.code = code.trim().toUpperCase();
        }
        return shiftsApi.createShift(createPayload);
      }
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? 'Master shift berhasil diperbarui'
          : 'Master shift baru berhasil disimpan'
      );
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-list'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const response = err.response;
      const data = response?.data;

      if (response?.status === 400) {
        const msg =
          data?.message ||
          'Shift sedang digunakan oleh petugas atau terdaftar di tim roster dan tidak dapat diubah.';
        setFormError(msg);
        toast.error(msg);
        return;
      }

      if (response?.status === 403) {
        const msg =
          data?.message || 'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah shift ini.';
        setFormError(msg);
        toast.error(msg);
        return;
      }

      if (response?.status === 422 && data?.errors) {
        const errorEntries = Object.entries(data.errors);
        if (errorEntries.length > 0) {
          const firstErrorMsg = (errorEntries[0][1] as string[])[0];
          setFormError(firstErrorMsg);
          toast.error(firstErrorMsg);
          return;
        }
      }

      const fallbackMsg = data?.message || err.message || 'Gagal menyimpan shift kerja';
      setFormError(fallbackMsg);
      toast.error(fallbackMsg);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isEditing ? 'Ubah Master Shift Kerja' : 'Tambah Master Shift Kerja Baru'}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Konfigurasikan jam kerja standar global atau shift khusus situs operasional.
              </p>
            </div>
          </div>
        </DialogHeader>

        {isGlobalShiftLocked ? (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-2 my-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold text-xs">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Shift Global Terkunci</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Shift ini merupakan Master Shift Global yang berlaku nasional. Hanya pengguna dengan role Super Admin yang memiliki hak akses untuk mengubah atau menghapus data shift ini.
            </p>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Tutup
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{formError}</div>
              </div>
            )}

            {/* Scope selection: Global Shift vs Site Specific */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Cakupan Berlakunya Shift
              </label>

              {isSuperAdmin ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isGlobalToggle"
                      checked={isGlobal}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsGlobal(checked);
                        if (checked) {
                          setSiteId('');
                        } else if (!siteId && sites.length > 0) {
                          setSiteId(sites[0].id);
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
                    />
                    <label
                      htmlFor="isGlobalToggle"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5"
                    >
                      <Globe className="h-3.5 w-3.5 text-blue-600" />
                      Jadikan Global Shift (Berlaku Nasional di Seluruh Pos/Situs)
                    </label>
                  </div>

                  {!isGlobal && (
                    <div className="pt-1.5 space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Pilih Situs Operasional Target <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={siteId}
                        onChange={(e) => setSiteId(e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        required={!isGlobal}
                      >
                        <option value="">Pilih Situs</option>
                        {sites.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Situs Operasional:</span>
                  </div>
                  {sites.length === 1 ? (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span>{sites[0].name}</span>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {sites[0].code}
                      </Badge>
                    </div>
                  ) : (
                    <select
                      value={siteId}
                      onChange={(e) => setSiteId(e.target.value)}
                      className="w-full h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      required
                    >
                      <option value="">Pilih Situs Penugasan</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Shift Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kode Shift
                </label>
                <Input
                  placeholder="misal: SHIFT_PAGI_SITE_A"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-xs font-mono"
                  maxLength={50}
                />
                <span className="text-[10px] text-slate-400 block">
                  Opsional. Kode unik pengenal shift.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Shift <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="misal: Shift Pagi Operasional"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  maxLength={100}
                />
                <span className="text-[10px] text-slate-400 block">
                  Nama deskriptif untuk jadwal satpam.
                </span>
              </div>
            </div>

            {/* Off Day Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isOffShiftCheck"
                checked={isOff}
                onChange={(e) => setIsOff(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
              />
              <label
                htmlFor="isOffShiftCheck"
                className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 font-medium"
              >
                <Coffee className="h-3.5 w-3.5 text-slate-400" />
                Shift Libur Dinas (OFF) tanpa jam kerja
              </label>
            </div>

            {/* Time Settings */}
            {!isOff && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-3 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Waktu Mulai <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="time"
                      required={!isOff}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Waktu Selesai <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="time"
                      required={!isOff}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Toleransi Telat (Menit)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={360}
                      value={lateTolerance}
                      onChange={(e) => setLateTolerance(Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Overnight preview helper */}
                <div className="flex items-center gap-2 text-[11px] pt-1">
                  {isOvernight ? (
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                      <Moon className="h-3.5 w-3.5" />
                      <span>Shift Malam Lintas Hari (Overnight): Berakhir pada keesokan harinya.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>Shift reguler di hari yang sama ({startTime} - {endTime}).</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
              <label htmlFor="activeStatusToggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <span className="font-semibold block">Status Keaktifan</span>
                <span className="text-[11px] text-slate-400">
                  Shift aktif dapat dipilih saat menyusun roster atau penugasan petugas.
                </span>
              </label>
              <input
                type="checkbox"
                id="activeStatusToggle"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saveMutation.isPending}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="text-xs font-semibold"
              >
                {saveMutation.isPending
                  ? 'Menyimpan...'
                  : isEditing
                  ? 'Simpan Perubahan'
                  : 'Simpan Shift'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
