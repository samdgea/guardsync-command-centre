'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi } from '@/features/shifts/api';
import { useAuthStore } from '@/stores/authStore';
import { Shift } from '@/types/shift';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShiftFormModal } from '@/components/shifts/ShiftFormModal';
import { ShiftDeleteDialog } from '@/components/shifts/ShiftDeleteDialog';
import {
  Clock,
  Plus,
  Moon,
  Sun,
  Coffee,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react';

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
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Modal states for CRUD operations
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);

  const { data: shiftsData, isLoading, refetch } = useQuery({
    queryKey: ['shifts-list', siteId],
    queryFn: () => shiftsApi.getShifts({ siteId }),
    enabled: isOpen,
  });

  const shifts = shiftsData?.data || [];

  const canManageShift = (shift: Shift): boolean => {
    const isShiftGlobal = shift.siteId === null || shift.siteId === undefined;
    if (isSuperAdmin) return true;
    if (isShiftGlobal) return false;
    return true; // inside site modal, the shift belongs to this site
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                Master Shift Kerja Situs
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="text-xs h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Shift Kustom Site
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Daftar master jam kerja yang berlaku di situs ini (gabungan Global Shift dan Kustom Site).
              </span>
              <Link
                href="/shifts"
                onClick={onClose}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 shrink-0"
              >
                <span>Halaman Penuh</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : shifts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Tidak ada data shift untuk situs ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg border-slate-200 dark:border-slate-800">
                {shifts.map((s) => {
                  const canManage = canManageShift(s);

                  return (
                    <div
                      key={s.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900/40 transition gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                          {s.isOff ? (
                            <Coffee className="h-4 w-4 text-slate-400" />
                          ) : s.isOvernight ? (
                            <Moon className="h-4 w-4 text-indigo-500" />
                          ) : (
                            <Sun className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{s.name}</span>
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
                                Lintas Malam
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {s.code}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
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

                        {canManage ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(s)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                              title="Ubah Shift"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span className="sr-only">Ubah</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDelete(s)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-red-600"
                              title="Hapus Shift"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic px-1">
                            Terkunci
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Modal for Create / Edit in Site context */}
      <ShiftFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={editingShift}
        defaultSiteId={siteId}
        onSuccess={() => refetch()}
      />

      {/* Delete Dialog in Site context */}
      <ShiftDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        shift={deletingShift}
        onSuccess={() => refetch()}
      />
    </>
  );
}
