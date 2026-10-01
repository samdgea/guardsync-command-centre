'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { logbooksApi } from '@/features/logbooks/api';
import { LogBookEntryCategory } from '@/types/logbook';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PhotoLightbox } from '@/components/report/PhotoLightbox';
import {
  BookOpen,
  ArrowLeft,
  PackageCheck,
  FileText,
  Clock,
  User,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, getPhotoUrl } from '@/lib/utils';

export default function LogbookDetailPage() {
  const params = useParams();
  const logBookId = params.logBookId as string;

  const [category, setCategory] = useState<LogBookEntryCategory | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);

  const { data: logbook, isLoading: isLogbookLoading } = useQuery({
    queryKey: ['logbook-detail', logBookId],
    queryFn: () => logbooksApi.getLogBookDetail(logBookId),
    enabled: !!logBookId,
  });

  const { data: entriesData, isLoading: isEntriesLoading } = useQuery({
    queryKey: ['logbook-entries', logBookId, category, fromDate, toDate],
    queryFn: () =>
      logbooksApi.getLogBookEntries(logBookId, {
        category: category || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
      }),
    enabled: !!logBookId,
  });

  const entries = entriesData?.data || [];
  const inventoryItems = logbook?.items || [];

  const handleOpenPhoto = (photos: any[], index: number = 0) => {
    setSelectedPhotos(
      photos.map((p, idx) => ({
        id: p.id || `photo-${idx}`,
        visitId: logBookId,
        path: getPhotoUrl(p),
        originalName: p.originalName || p.name || `Lampiran ${idx + 1}`,
        createdAt: new Date().toISOString(),
      }))
    );
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/logbooks"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Kembali ke Buku Mutasi
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-slate-700 dark:text-slate-300" />
              Detail Mutasi Shift & Rekap Pos
            </h1>
            <p className="text-xs text-slate-500">
              Pemeriksaan fisik sarana prasarana dan timeline peristiwa penting selama shift.
            </p>
          </div>
          {logbook && (
            <Badge
              variant={
                logbook.status === 'ACCEPTED'
                  ? 'aman'
                  : logbook.status === 'ACTIVE'
                  ? 'reviewed'
                  : 'secondary'
              }
              className="text-xs px-3 py-1 uppercase font-bold"
            >
              Status: {logbook.status}
            </Badge>
          )}
        </div>
      </div>

      {isLogbookLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Shift Jaga</span>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              Shift {logbook?.shift}
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              ID: {logbook?.id?.slice(0, 8)}...
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Petugas Buka Shift (Pembuat)</span>
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {logbook?.createdBy?.name || '-'}
            </div>
            <div className="text-slate-500 text-[11px]">
              Dibuka: {formatDate(logbook?.createdAt)}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Petugas Terima Shift (Penerima)</span>
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {logbook?.acceptedBy?.name || '-'}
            </div>
            <div className="text-slate-500 text-[11px]">
              Ditutup: {logbook?.acceptedAt ? formatDate(logbook.acceptedAt) : 'Belum Ditutup'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Status Serah Terima</span>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {logbook?.status === 'ACCEPTED'
                ? 'Mutasi Diterima Penuh'
                : logbook?.status === 'CLOSED'
                ? 'Shift Ditutup (Menunggu Terima)'
                : 'Shift Sedang Bertugas'}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-emerald-600" />
                Cek Fisik Inventaris Pos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
              {inventoryItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Tidak ada data cek fisik inventaris pada mutasi ini.
                </div>
              ) : (
                inventoryItems.map((item) => (
                  <div key={item.id} className="p-3.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </span>
                      <Badge
                        variant={item.condition === 'BAIK' ? 'aman' : 'darurat'}
                        className="text-[10px]"
                      >
                        {item.condition === 'BAIK' ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            BAIK
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            RUSAK
                          </span>
                        )}
                      </Badge>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-slate-500 italic">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Catatan Peristiwa / Kejadian Pos ({entries.length})
                </CardTitle>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                >
                  <option value="">Semua Kategori</option>
                  <option value="BARANG_MASUK">BARANG_MASUK</option>
                  <option value="BARANG_KELUAR">BARANG_KELUAR</option>
                  <option value="MONITORING">MONITORING</option>
                  <option value="KERUSAKAN">KERUSAKAN</option>
                  <option value="POTENSI_BAHAYA">POTENSI_BAHAYA</option>
                  <option value="INSIDEN">INSIDEN</option>
                  <option value="LAINNYA">LAINNYA</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {isEntriesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : entries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Tidak ada catatan peristiwa yang dilaporkan pada shift ini.
                </div>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            entry.category === 'INSIDEN' || entry.category === 'POTENSI_BAHAYA'
                              ? 'darurat'
                              : entry.category === 'KERUSAKAN'
                              ? 'waspada'
                              : 'outline'
                          }
                          className="text-[10px] font-bold uppercase"
                        >
                          {entry.category}
                        </Badge>
                        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(entry.occurredAt)}
                        </span>
                      </div>

                      <p className="text-sm text-slate-800 dark:text-slate-200">
                        {entry.description}
                      </p>

                      {entry.photos && entry.photos.length > 0 && (
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                              <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                              Foto Dokumentasi ({entry.photos.length}):
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenPhoto(entry.photos || [], 0)}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Lihat Semua →
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {entry.photos.map((photo, idx) => {
                              const photoUrl = getPhotoUrl(photo);
                              return (
                                <button
                                  key={(photo as any)?.id || idx}
                                  type="button"
                                  onClick={() => handleOpenPhoto(entry.photos || [], idx)}
                                  className="group relative h-16 w-16 rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-blue-500 transition-all focus:outline-none"
                                  title="Klik untuk memperbesar"
                                >
                                  <img
                                    src={photoUrl}
                                    alt={`Dokumentasi ${idx + 1}`}
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                                    onError={(e) => {
                                      (e.target as HTMLElement).classList.add('opacity-40');
                                    }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PhotoLightbox
        photos={selectedPhotos}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}