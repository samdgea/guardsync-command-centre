'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi } from '@/features/shifts/api';
import { Shift } from '@/types/shift';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  Plus,
  Moon,
  Sun,
  ShieldCheck,
  AlertCircle,
  Coffee,
} from 'lucide-react';
import { toast } from 'sonner';

interface MasterShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
}

export function MasterShiftModal({
  isOpen,
  onClose,
  siteId,
}: MasterShiftModalProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  // New shift form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [lateTolerance, setLateTolerance] = useState(15);
  const [isOff, setIsOff] = useState(false);

  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ['shifts-list', siteId],
    queryFn: () => shiftsApi.getShifts({ siteId }),
    enabled: isOpen,
  });

  const shifts = shiftsData?.data || [];

  const createShiftMutation = useMutation({
    mutationFn: async () => {
      if (!code.trim()) throw new Error('Kode shift wajib diisi');
      if (!name.trim()) throw new Error('Nama shift wajib diisi');

      const formattedStartTime = isOff ? null : (startTime.length === 5 ? `${startTime}:00` : startTime);
      const formattedEndTime = isOff ? null : (endTime.length === 5 ? `${endTime}:00` : endTime);

      return shiftsApi.createShift({
        siteId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        lateToleranceMinutes: isOff ? 0 : Number(lateTolerance),
        isOff,
        active: true,
      });
    },
    onSuccess: () => {
      toast.success('Master shift kustom berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['shifts-list', siteId] });
      setIsCreating(false);
      setCode('');
      setName('');
      setStartTime('08:00');
      setEndTime('16:00');
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err.message || 'Gagal membuat master shift'
      );
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              Master Shift Kerja
            </DialogTitle>
            {!isCreating && (
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
                className="text-xs h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Shift Kustom Site
              </Button>
            )}
          </div>
        </DialogHeader>

        {isCreating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createShiftMutation.mutate();
            }}
            className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Buat Jam Shift Operasional Khusus Site
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kode Shift <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="misal: SHIFT_KHUSUS_12JAM"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Tampilan Shift <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="misal: Shift Siang 12 Jam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isOffDayCheck"
                checked={isOff}
                onChange={(e) => setIsOff(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
              />
              <label htmlFor="isOffDayCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                Ini adalah Shift Libur Dinas (OFF) tanpa jam kerja
              </label>
            </div>

            {!isOff && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Jam Mulai (Masuk)
                  </label>
                  <Input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Jam Selesai (Pulang)
                  </label>
                  <Input
                    type="time"
                    required
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
                    max={120}
                    value={lateTolerance}
                    onChange={(e) => setLateTolerance(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreating(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createShiftMutation.isPending}
                className="text-xs font-semibold"
              >
                {createShiftMutation.isPending ? 'Menyimpan...' : 'Simpan Shift'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-500">
              Daftar master jam kerja yang berlaku di sistem, mencakup jam kerja standar global maupun shift operasional kustom site.
            </p>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : shifts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Tidak ada data shift.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg border-slate-200 dark:border-slate-800">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        {s.isOff ? (
                          <Coffee className="h-4 w-4 text-slate-400" />
                        ) : s.isOvernight ? (
                          <Moon className="h-4 w-4 text-indigo-500" />
                        ) : (
                          <Sun className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{s.name}</span>
                          {s.siteId ? (
                            <Badge variant="outline" className="text-[9px] py-0">
                              Kustom Site
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px] py-0">
                              Global
                            </Badge>
                          )}
                          {s.isOvernight && (
                            <Badge variant="outline" className="text-[9px] py-0 text-indigo-600 border-indigo-200">
                              Lewat Tengah Malam
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {s.code}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {s.isOff ? (
                        <span className="text-slate-400 font-medium">Libur Dinas</span>
                      ) : (
                        <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)} WIB
                          <div className="text-[10px] text-slate-400 font-sans">
                            Toleransi: {s.lateToleranceMinutes ?? 15} mnt
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
