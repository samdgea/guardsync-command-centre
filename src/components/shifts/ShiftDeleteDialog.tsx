'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface ShiftDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  shift: Shift | null;
}

export function ShiftDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  shift,
}: ShiftDeleteDialogProps) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!shift) return;
      setErrorMessage(null);
      return shiftsApi.deleteShift(shift.id);
    },
    onSuccess: () => {
      toast.success('Master shift berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-list'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const response = err.response;
      const data = response?.data;

      if (response?.status === 400) {
        const detailMsg =
          data?.errors?.shift?.[0] ||
          data?.message ||
          'Shift sedang digunakan pada penugasan petugas aktif, tim roster, atau riwayat absensi. Alihkan penugasan petugas terlebih dahulu sebelum menghapus shift ini.';
        setErrorMessage(detailMsg);
        toast.error('Gagal menghapus: Shift sedang digunakan');
        return;
      }

      if (response?.status === 403) {
        const msg =
          data?.message ||
          'Hanya Super Admin yang berwenang menghapus shift global, atau akses ditolak.';
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      const fallback = data?.message || err.message || 'Gagal menghapus shift kerja';
      setErrorMessage(fallback);
      toast.error(fallback);
    },
  });

  if (!shift) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <Trash2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Hapus Master Shift Kerja
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Apakah Anda yakin ingin menghapus master shift berikut dari sistem?
          </p>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>{shift.name}</span>
              {shift.siteId ? (
                <Badge variant="outline" className="text-[10px] py-0">
                  {shift.site?.name || 'Kustom Site'}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] py-0">
                  Global (Nasional)
                </Badge>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Kode: {shift.code}
            </div>
            <div className="text-[11px] text-slate-500">
              {shift.isOff
                ? 'Libur Dinas (OFF)'
                : `Jam Kerja: ${shift.startTime?.slice(0, 5)} - ${shift.endTime?.slice(0, 5)} WIB`}
            </div>
          </div>

          {/* In-Use Guard Warning / Error Banner */}
          {errorMessage ? (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-2.5 text-red-800 dark:text-red-200">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="space-y-1">
                <span className="font-semibold block">Proteksi Data (In-Use Guard)</span>
                <p className="text-[11px] leading-relaxed text-red-700 dark:text-red-300">
                  {errorMessage}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                Shift yang masih terikat dengan penugasan satpam, roster tim, atau riwayat absensi tidak dapat dihapus.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
            className="text-xs font-semibold"
          >
            {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
