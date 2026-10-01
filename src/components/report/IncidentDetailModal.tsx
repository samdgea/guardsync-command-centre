'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PatrolVisit, ReviewStatus } from '@/types/report';
import { formatDate, getPhotoUrl } from '@/lib/utils';
import { PhotoLightbox } from './PhotoLightbox';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Image as ImageIcon,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

interface IncidentDetailModalProps {
  visit: PatrolVisit | null;
  isOpen: boolean;
  onClose: () => void;
  onReview?: (id: string, status: ReviewStatus) => Promise<void>;
}

export function IncidentDetailModal({
  visit,
  isOpen,
  onClose,
  onReview,
}: IncidentDetailModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Always reset lightbox state whenever modal opens or closes
  React.useEffect(() => {
    if (!isOpen) {
      setLightboxOpen(false);
      setPhotoIndex(0);
    }
  }, [isOpen]);

  if (!visit) return null;

  const handleModalClose = () => {
    setLightboxOpen(false);
    onClose();
  };

  const handleUpdateStatus = async (status: ReviewStatus) => {
    if (!onReview) return;
    setIsUpdating(true);
    try {
      await onReview(visit.id, status);
      toast.success(`Status berhasil diperbarui menjadi ${status}`);
      handleModalClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui status');
    } finally {
      setIsUpdating(false);
    }
  };

  const conditionVariant =
    visit.condition === 'DARURAT'
      ? 'darurat'
      : visit.condition === 'WASPADA'
      ? 'waspada'
      : 'aman';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            if (lightboxOpen) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (lightboxOpen) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (lightboxOpen) e.preventDefault();
          }}
        >
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <Badge variant={conditionVariant} className="text-xs px-2.5 py-0.5 uppercase">
                  {visit.condition}
                </Badge>
                <DialogTitle className="text-lg font-bold">
                  Detail Laporan Kunjungan Checkpoint
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Waktu scan: {formatDate(visit.created_at || visit.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Meta cards */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <MapPin className="h-3.5 w-3.5" />
                  Titik Patroli & GPS
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {visit.checkpoint?.name || 'Checkpoint'} ({visit.checkpoint?.code || '-'})
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {visit.latitude ?? '-'}, {visit.longitude ?? '-'} (Jarak: {visit.distanceMeters ?? 0}m)
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <User className="h-3.5 w-3.5" />
                  Petugas Pelapor
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {visit.user?.name || visit.officer?.name || 'Petugas Satpam'}
                </div>
                <div className="text-[11px] text-slate-500">
                  NIK: {visit.user?.employee_id || visit.user?.employeeId || visit.officer?.employeeId || '-'}
                </div>
              </div>
            </div>

            {/* Officer Notes */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Temuan Petugas:
              </h4>
              <p className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200">
                {visit.notes || 'Tidak ada catatan khusus.'}
              </p>
            </div>

            {/* Photos Section */}
            {visit.photos && visit.photos.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                  Foto Bukti Temuan ({visit.photos.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {visit.photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => {
                        setPhotoIndex(index);
                        setLightboxOpen(true);
                      }}
                      className="group relative h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <img
                        src={getPhotoUrl(photo)}
                        alt="Bukti Temuan"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                        Perbesar
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status Logs Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-slate-500" />
                Riwayat Perubahan Status (Status Logs)
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                {visit.statusLogs && visit.statusLogs.length > 0 ? (
                  visit.statusLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2.5 text-xs">
                      <div className="h-2 w-2 rounded-full bg-slate-400 mt-1 shrink-0" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {log.toStatus}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                          Diubah oleh: {log.changerName || 'Sistem'}
                          {log.notes && ` — "${log.notes}"`}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada catatan riwayat status.</p>
                )}
              </div>
            </div>

            {/* Quick Disposition / Action Buttons */}
            {onReview && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ubah Tindak Lanjut Review:
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating || visit.reviewStatus === 'REVIEWED'}
                    onClick={() => handleUpdateStatus('REVIEWED')}
                    className="text-xs"
                  >
                    Tandai REVIEWED
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating || visit.reviewStatus === 'ACKNOWLEDGED'}
                    onClick={() => handleUpdateStatus('ACKNOWLEDGED')}
                    className="text-xs text-indigo-600 dark:text-indigo-400"
                  >
                    ACKNOWLEDGED
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating || visit.reviewStatus === 'ESCALATED'}
                    onClick={() => handleUpdateStatus('ESCALATED')}
                    className="text-xs text-purple-600 dark:text-purple-400"
                  >
                    Eskalasi (ESCALATED)
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={isUpdating || visit.reviewStatus === 'RESOLVED'}
                    onClick={() => handleUpdateStatus('RESOLVED')}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Selesai (RESOLVED)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <PhotoLightbox
        photos={visit.photos || []}
        initialIndex={photoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
