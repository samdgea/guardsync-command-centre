'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '@/features/sites/api';
import { shiftsApi } from '@/features/shifts/api';
import { usersApi } from '@/features/users/api';
import { ScheduleType, Shift } from '@/types/shift';
import { SiteOfficer } from '@/types/site';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Users,
  Calendar,
  Clock,
  Layers,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  officerToEdit?: SiteOfficer | null;
  onSuccess?: () => void;
  onOpenCreateTeamModal?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Senin', short: 'Sen' },
  { value: 2, label: 'Selasa', short: 'Sel' },
  { value: 3, label: 'Rabu', short: 'Rab' },
  { value: 4, label: 'Kamis', short: 'Kam' },
  { value: 5, label: 'Jumat', short: 'Jum' },
  { value: 6, label: 'Sabtu', short: 'Sab' },
  { value: 7, label: 'Minggu', short: 'Min' },
];

export function AssignOfficerModal({
  isOpen,
  onClose,
  siteId,
  officerToEdit,
  onSuccess,
  onOpenCreateTeamModal,
}: AssignOfficerModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!officerToEdit;

  // Form states
  const [selectedUserId, setSelectedUserId] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('ROSTER');
  const [rosterTeamId, setRosterTeamId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [isPrimary, setIsPrimary] = useState(true);

  // Queries
  const { data: usersData } = useQuery({
    queryKey: ['available-users-for-assignment'],
    queryFn: () => usersApi.getUsers({ limit: 100, active: true }),
    enabled: isOpen && !isEditing,
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams-dropdown', siteId],
    queryFn: () => shiftsApi.getTeamsDropdown(siteId),
    enabled: isOpen,
  });

  const { data: shiftsData } = useQuery({
    queryKey: ['shifts-list', siteId],
    queryFn: () => shiftsApi.getShifts({ siteId, active: true }),
    enabled: isOpen,
  });

  const availableTeams = teamsData?.data || [];
  const availableShifts = (shiftsData?.data || []).filter((s) => !s.isOff);
  const candidateUsers = usersData?.data || [];

  // Reset or initialize state
  useEffect(() => {
    if (officerToEdit) {
      setSelectedUserId(officerToEdit.userId);
      setScheduleType(officerToEdit.scheduleType || null);
      setRosterTeamId(officerToEdit.rosterTeamId || officerToEdit.rosterTeam?.id || '');
      setShiftId(officerToEdit.shiftId || officerToEdit.shift?.id || '');
      setWorkDays(officerToEdit.workDays && officerToEdit.workDays.length > 0 ? officerToEdit.workDays : [1, 2, 3, 4, 5]);
      setIsPrimary(officerToEdit.primary !== false);
    } else {
      setSelectedUserId('');
      setScheduleType(availableTeams.length > 0 ? 'ROSTER' : 'FIXED');
      setRosterTeamId(availableTeams[0]?.id || '');
      // Find default normal shift or first available
      const normalShift = availableShifts.find((s) => s.code === 'DEFAULT_SHIFT_NORMAL');
      setShiftId(normalShift?.id || availableShifts[0]?.id || '');
      setWorkDays([1, 2, 3, 4, 5]);
      setIsPrimary(true);
    }
  }, [officerToEdit, isOpen, availableTeams.length, availableShifts.length]);

  // If active team selected, get team info for preview
  const selectedTeam = useMemo(() => {
    return availableTeams.find((t) => t.id === rosterTeamId);
  }, [availableTeams, rosterTeamId]);

  const toggleDay = (day: number) => {
    if (workDays.includes(day)) {
      if (workDays.length === 1) {
        toast.error('Harap pilih minimal satu hari kerja');
        return;
      }
      setWorkDays(workDays.filter((d) => d !== day));
    } else {
      setWorkDays([...workDays, day].sort());
    }
  };

  const applyWorkDaysPreset = (days: number[]) => {
    setWorkDays(days);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isEditing && !selectedUserId) {
        throw new Error('Silakan pilih petugas terlebih dahulu');
      }

      if (scheduleType === 'ROSTER') {
        if (!rosterTeamId) {
          throw new Error('Silakan pilih tim roster');
        }
      } else if (scheduleType === 'FIXED') {
        if (!shiftId) {
          throw new Error('Silakan pilih master shift jam kerja');
        }
        if (workDays.length === 0) {
          throw new Error('Silakan pilih minimal satu hari kerja');
        }
      }

      if (isEditing && officerToEdit) {
        return sitesApi.updateOfficerAssignment(siteId, officerToEdit.userId, {
          scheduleType,
          rosterTeamId: scheduleType === 'ROSTER' ? rosterTeamId : null,
          shiftId: scheduleType === 'FIXED' ? shiftId : null,
          workDays: scheduleType === 'FIXED' ? workDays : null,
          primary: isPrimary,
        });
      } else {
        return sitesApi.assignOfficer(siteId, {
          userId: selectedUserId,
          scheduleType,
          rosterTeamId: scheduleType === 'ROSTER' ? rosterTeamId : null,
          shiftId: scheduleType === 'FIXED' ? shiftId : null,
          workDays: scheduleType === 'FIXED' ? workDays : null,
          primary: isPrimary,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? 'Konfigurasi jadwal petugas berhasil diperbarui'
          : 'Petugas berhasil ditugaskan ke situs ini'
      );
      queryClient.invalidateQueries({ queryKey: ['site-officers', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site-roster', siteId] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Gagal memproses penugasan petugas'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Pengaturan Jadwal: ${officerToEdit?.user?.name}`
              : 'Tugaskan Petugas ke Situs Ini'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* User selector or display */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Petugas Satpam / Supervisor <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {officerToEdit?.user?.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    NIK: {officerToEdit?.user?.employeeId || '-'} ({officerToEdit?.user?.role})
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Terdaftar
                </Badge>
              </div>
            ) : (
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
            )}
          </div>

          {/* Schedule Model Radio Group */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Tipe / Model Jadwal Kerja <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Roster */}
              <label
                className={cn(
                  'relative flex flex-col p-3 rounded-lg border cursor-pointer transition',
                  scheduleType === 'ROSTER'
                    ? 'border-slate-900 bg-slate-50/80 dark:border-slate-100 dark:bg-slate-800/80 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={scheduleType === 'ROSTER'}
                    onChange={() => setScheduleType('ROSTER')}
                    className="h-3.5 w-3.5 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Tim Roster
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 pl-5">
                  Shift bergilir mengikuti putaran tim (misal 2 Pagi, 2 Malam, 2 Libur).
                </span>
              </label>

              {/* Option 2: Fixed */}
              <label
                className={cn(
                  'relative flex flex-col p-3 rounded-lg border cursor-pointer transition',
                  scheduleType === 'FIXED'
                    ? 'border-slate-900 bg-slate-50/80 dark:border-slate-100 dark:bg-slate-800/80 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={scheduleType === 'FIXED'}
                    onChange={() => setScheduleType('FIXED')}
                    className="h-3.5 w-3.5 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Jam Tetap
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 pl-5">
                  Jam kerja teratur non-shift (misal jam 07:00 - 17:00 Senin s/d Jumat).
                </span>
              </label>

              {/* Option 3: Unassigned */}
              <label
                className={cn(
                  'relative flex flex-col p-3 rounded-lg border cursor-pointer transition',
                  scheduleType === null
                    ? 'border-slate-900 bg-slate-50/80 dark:border-slate-100 dark:bg-slate-800/80 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={scheduleType === null}
                    onChange={() => setScheduleType(null)}
                    className="h-3.5 w-3.5 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Belum Ditentukan
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 pl-5">
                  Jadwal kosong sampai Admin menetapkannya di kemudian hari.
                </span>
              </label>
            </div>
          </div>

          {/* Conditional 1: ROSTER Configuration */}
          {scheduleType === 'ROSTER' && (
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  Pilih Tim Roster Site <span className="text-red-500">*</span>
                </label>
                {availableTeams.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenCreateTeamModal?.();
                    }}
                    className="text-[11px] h-7"
                  >
                    + Buat Tim Roster
                  </Button>
                )}
              </div>

              {availableTeams.length === 0 ? (
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    Situs ini belum memiliki tim roster. Anda dapat membuat tim terlebih dahulu melalui menu <strong>Tim Roster</strong> atau memilih tipe <strong>Jam Tetap</strong>.
                  </div>
                </div>
              ) : (
                <select
                  required
                  value={rosterTeamId}
                  onChange={(e) => setRosterTeamId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Pilih Tim Roster --</option>
                  {availableTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} : {t.name} ({t.shiftPattern?.length || 0} hari siklus)
                    </option>
                  ))}
                </select>
              )}

              {/* Team preview */}
              {selectedTeam && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Pola Giliran Tim:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      Mulai: {selectedTeam.patternStartDate}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTeam.shiftPattern?.map((shiftCode, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-medium border',
                          shiftCode.includes('OFF') || shiftCode.includes('LIBUR')
                            ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                        )}
                      >
                        H-{idx + 1}: {shiftCode.replace('DEFAULT_', '').replace('SHIFT_', '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conditional 2: FIXED Configuration */}
          {scheduleType === 'FIXED' && (
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  Shift Jam Kerja Harian <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Pilih Jam Kerja Shift --</option>
                  {availableShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Work days checkboxes */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Hari Kerja Aktif <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyWorkDaysPreset([1, 2, 3, 4, 5])}
                      className="text-[10px] text-blue-600 hover:underline px-1"
                    >
                      Sen-Jum
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => applyWorkDaysPreset([1, 2, 3, 4, 5, 6])}
                      className="text-[10px] text-blue-600 hover:underline px-1"
                    >
                      Sen-Sab
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => applyWorkDaysPreset([1, 2, 3, 4, 5, 6, 7])}
                      className="text-[10px] text-blue-600 hover:underline px-1"
                    >
                      Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = workDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          'py-1.5 rounded text-xs font-semibold border transition text-center',
                          isSelected
                            ? 'bg-slate-900 text-slate-50 border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                        )}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500">
                  Hari yang tidak dipilih otomatis tercatat sebagai Hari Libur Dinas (OFF).
                </p>
              </div>
            </div>
          )}

          {/* Conditional 3: UNASSIGNED Note */}
          {scheduleType === null && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <HelpCircle className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
              <div>
                Petugas berstatus aktif di site ini namun belum ditentukan jadwal dinasnya. Sistem tidak akan memaksakan siklus rotasi sebelum Admin menetapkannya.
              </div>
            </div>
          )}

          {/* Primary Base Checkbox */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <input
              type="checkbox"
              id="isPrimaryAssignment"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
            />
            <label
              htmlFor="isPrimaryAssignment"
              className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Tandai sebagai pangkalan utama (primary site) petugas
            </label>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
                ? 'Simpan Pengaturan'
                : 'Tugaskan Petugas'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
