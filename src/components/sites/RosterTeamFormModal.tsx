'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi } from '@/features/shifts/api';
import { RosterTeam } from '@/types/shift';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShiftPatternBuilder } from './ShiftPatternBuilder';
import { toast } from 'sonner';

interface RosterTeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  teamToEdit?: RosterTeam | null;
  onSuccess?: () => void;
}

export function RosterTeamFormModal({
  isOpen,
  onClose,
  siteId,
  teamToEdit,
  onSuccess,
}: RosterTeamFormModalProps) {
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [patternStartDate, setPatternStartDate] = useState('');
  const [shiftPattern, setShiftPattern] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  const isEditing = !!teamToEdit;

  useEffect(() => {
    if (teamToEdit) {
      setCode(teamToEdit.code || '');
      setName(teamToEdit.name || '');
      setPatternStartDate(
        teamToEdit.patternStartDate || new Date().toISOString().split('T')[0]
      );
      setShiftPattern(teamToEdit.shiftPattern || []);
      setActive(teamToEdit.active !== false);
    } else {
      setCode('');
      setName('');
      setPatternStartDate(new Date().toISOString().split('T')[0]);
      setShiftPattern([
        'DEFAULT_SHIFT_PAGI',
        'DEFAULT_SHIFT_PAGI',
        'DEFAULT_SHIFT_MALAM',
        'DEFAULT_SHIFT_MALAM',
        'DEFAULT_OFF_DAY',
        'DEFAULT_OFF_DAY',
      ]);
      setActive(true);
    }
  }, [teamToEdit, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!code.trim()) {
        throw new Error('Kode tim wajib diisi (contoh: TIM-A)');
      }
      if (!name.trim()) {
        throw new Error('Nama tim wajib diisi (contoh: Tim Alpha Reguler)');
      }
      if (!patternStartDate) {
        throw new Error('Tanggal acuan awal putaran wajib diisi');
      }
      if (shiftPattern.length === 0) {
        throw new Error('Pola perputaran shift minimal harus memiliki 1 giliran');
      }

      if (isEditing && teamToEdit) {
        return shiftsApi.updateRosterTeam(siteId, teamToEdit.id, {
          code: code.trim(),
          name: name.trim(),
          patternStartDate,
          shiftPattern,
          active,
        });
      } else {
        return shiftsApi.createRosterTeam(siteId, {
          code: code.trim(),
          name: name.trim(),
          patternStartDate,
          shiftPattern,
          active,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? 'Tim roster berhasil diperbarui'
          : 'Tim roster baru berhasil dibuat'
      );
      queryClient.invalidateQueries({ queryKey: ['roster-teams', siteId] });
      queryClient.invalidateQueries({ queryKey: ['teams-dropdown', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site-roster', siteId] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Gagal menyimpan konfigurasi tim roster'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Tim Roster: ${teamToEdit?.code}` : 'Tambah Tim Roster Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Kode Tim <span className="text-red-500">*</span>
              </label>
              <Input
                required
                maxLength={50}
                placeholder="misal: TIM-A"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-xs font-mono font-semibold"
              />
              <p className="text-[10px] text-slate-500">
                Pengenal unik tim di site (contoh: TIM-A, TIM-B).
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Nama Tampilan Tim <span className="text-red-500">*</span>
              </label>
              <Input
                required
                maxLength={100}
                placeholder="misal: Tim Alpha Pos Barat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-slate-500">
                Nama deskriptif tim yang mudah dikenali pengawas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Tanggal Awal Acuan Putaran (Anchor Date) <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={patternStartDate}
                onChange={(e) => setPatternStartDate(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-slate-500">
                Tanggal ketika giliran hari ke-1 dimulai. Sistem menghitung putaran berikutnya secara otomatis tak terbatas.
              </p>
            </div>

            <div className="space-y-1 flex flex-col justify-end pb-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="teamActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
                />
                <label
                  htmlFor="teamActive"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Tim Berstatus Aktif (Dapat Ditugaskan)
                </label>
              </div>
            </div>
          </div>

          {/* Shift Pattern Builder */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>
                Urutan Pola Perputaran Shift (Cyclic Shift Pattern) <span className="text-red-500">*</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                Seluruh anggota tim ini akan mengikuti pola giliran yang sama
              </span>
            </label>
            <ShiftPatternBuilder
              siteId={siteId}
              value={shiftPattern}
              onChange={setShiftPattern}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
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
                ? 'Perbarui Tim'
                : 'Buat Tim Roster'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
