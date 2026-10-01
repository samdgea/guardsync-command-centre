'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '@/features/reports/api';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { PatrolCondition, PatrolVisit, ReviewStatus } from '@/types/report';
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
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { IncidentDetailModal } from '@/components/report/IncidentDetailModal';
import { formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  Download,
  Filter,
  Eye,
  Trash2,
  CheckSquare,
  Square,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PatrolVisitsReviewPage() {
  const queryClient = useQueryClient();
  const selectedSiteId = useSiteContextStore((s) => s.selectedSiteId);
  const sitesList = useSiteContextStore((s) => s.sitesList);

  const [page, setPage] = useState(1);
  const [filterSiteId, setFilterSiteId] = useState(selectedSiteId || '');
  const [condition, setCondition] = useState<PatrolCondition | ''>('');
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [activeVisit, setActiveVisit] = useState<PatrolVisit | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ReviewStatus>('REVIEWED');

  React.useEffect(() => {
    if (selectedSiteId) {
      setFilterSiteId(selectedSiteId);
    }
  }, [selectedSiteId]);

  const { data, isLoading } = useQuery({
    queryKey: [
      'reports-visits',
      page,
      filterSiteId,
      condition,
      reviewStatus,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      reportsApi.getVisits({
        page,
        limit: 15,
        siteId: filterSiteId || undefined,
        condition: (condition as PatrolCondition) || undefined,
        reviewStatus: (reviewStatus as ReviewStatus) || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) =>
      reportsApi.reviewVisit(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-visits'] });
      queryClient.invalidateQueries({ queryKey: ['reports-summary'] });
    },
  });

  const bulkReviewMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: ReviewStatus }) =>
      reportsApi.bulkReviewVisits({ ids, status }),
    onSuccess: (count) => {
      toast.success(`${count} kunjungan patroli berhasil ditinjau.`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['reports-visits'] });
      queryClient.invalidateQueries({ queryKey: ['reports-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal melakukan bulk review');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.deleteVisit(id),
    onSuccess: () => {
      toast.success('Log kunjungan patroli berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['reports-visits'] });
      queryClient.invalidateQueries({ queryKey: ['reports-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus log kunjungan');
    },
  });

  const handleExportCsv = async () => {
    try {
      toast.info('Menyiapkan file ekspor CSV...');
      await reportsApi.exportCsv({
        siteId: filterSiteId || undefined,
        condition: (condition as PatrolCondition) || undefined,
        reviewStatus: (reviewStatus as ReviewStatus) || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
      });
      toast.success('Ekspor CSV selesai');
    } catch {
      toast.error('Gagal mengunduh file CSV');
    }
  };

  const rawVisits = data?.data;
  const visits: PatrolVisit[] = Array.isArray(rawVisits) ? rawVisits : [];
  const visitsSummary = (data as any)?.summary || (!Array.isArray(rawVisits) && rawVisits ? rawVisits : null);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === visits.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visits.map((v) => v.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkSubmit = () => {
    if (selectedIds.length === 0) return;
    if (selectedIds.length > 200) {
      toast.error('Maksimal 200 item per review massal');
      return;
    }
    bulkReviewMutation.mutate({ ids: selectedIds, status: bulkStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Review Desk Kunjungan Patroli
          </h1>
          <p className="text-sm text-slate-500">
            Audit log scan satpam, verifikasi temuan insiden, dan disposisi status review laporan.
          </p>
        </div>

        <Button onClick={handleExportCsv} variant="outline" className="text-xs">
          <Download className="h-4 w-4 mr-1.5" />
          Ekspor CSV
        </Button>
      </div>

      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          Filter Kunjungan
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Situs / Site
            </label>
            <select
              value={filterSiteId}
              onChange={(e) => setFilterSiteId(e.target.value)}
              className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs"
            >
              <option value="">Semua Situs</option>
              {sitesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Kondisi Keamanan
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as any)}
              className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs"
            >
              <option value="">Semua Kondisi</option>
              <option value="AMAN">AMAN</option>
              <option value="WASPADA">WASPADA</option>
              <option value="DARURAT">DARURAT</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Status Review
            </label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as any)}
              className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">PENDING</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Dari Tanggal
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Sampai Tanggal
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-semibold">
            <CheckCheck className="h-4 w-4" />
            {selectedIds.length} laporan terpilih untuk review massal
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400">Set Status:</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as ReviewStatus)}
              className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
            >
              <option value="REVIEWED">REVIEWED (Terverifikasi)</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="ESCALATED">ESCALATED (Eskalasi)</option>
              <option value="RESOLVED">RESOLVED (Selesai)</option>
            </select>
            <Button
              size="sm"
              onClick={handleBulkSubmit}
              disabled={bulkReviewMutation.isPending}
              className="h-8 text-xs font-semibold"
            >
              {bulkReviewMutation.isPending ? 'Menerapkan...' : 'Terapkan Masal'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : visits.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <p>Tidak ada laporan kunjungan patroli yang sesuai filter.</p>
            {visitsSummary && (
              <p className="text-xs text-slate-400">
                (Metrik saat ini: Total {visitsSummary.totalVisits ?? visitsSummary.total ?? 0} kunjungan, {visitsSummary.pending ?? 0} menunggu review)
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <button
                    onClick={handleToggleSelectAll}
                    aria-label="Pilih semua baris"
                    className="flex items-center justify-center p-1 text-slate-500"
                  >
                    {selectedIds.length === visits.length ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Waktu Scan</TableHead>
                <TableHead>Titik Checkpoint</TableHead>
                <TableHead>Petugas Satpam</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Catatan & Bukti</TableHead>
                <TableHead>Status Review</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((visit) => {
                const isSelected = selectedIds.includes(visit.id);
                const conditionVariant =
                  visit.condition === 'DARURAT'
                    ? 'darurat'
                    : visit.condition === 'WASPADA'
                    ? 'waspada'
                    : 'aman';

                const currentReviewStatus = (visit.review_status || visit.reviewStatus || 'PENDING') as ReviewStatus;
                const scanTime = visit.created_at || visit.createdAt;

                const reviewVariant =
                  currentReviewStatus === 'RESOLVED'
                    ? 'resolved'
                    : currentReviewStatus === 'ESCALATED'
                    ? 'escalated'
                    : currentReviewStatus === 'REVIEWED'
                    ? 'reviewed'
                    : currentReviewStatus === 'ACKNOWLEDGED'
                    ? 'acknowledged'
                    : 'pending';

                return (
                  <TableRow
                    key={visit.id}
                    className={isSelected ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}
                  >
                    <TableCell>
                      <button
                        onClick={() => handleToggleRow(visit.id)}
                        aria-label="Pilih baris laporan"
                        className="flex items-center justify-center p-1 text-slate-500"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(scanTime)}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {visit.checkpoint?.name || 'Checkpoint'}
                      {visit.checkpoint?.code && (
                        <span className="block text-[11px] font-mono text-slate-400">
                          {visit.checkpoint.code}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                      {visit.user?.name || visit.officer?.name || 'Petugas'}
                      <span className="block text-[10px] text-slate-400">
                        {visit.user?.employee_id || visit.user?.employeeId || visit.officer?.employeeId}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={conditionVariant} className="text-[10px] uppercase font-bold">
                        {visit.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-xs">
                      <div className="truncate text-slate-600 dark:text-slate-400">
                        {visit.notes || 'Tanpa catatan khusus'}
                      </div>
                      {visit.photos && visit.photos.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          <span>📷 {visit.photos.length} Foto Bukti</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reviewVariant} className="text-[10px] uppercase">
                        {currentReviewStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        title="Lihat Detail & Bukti"
                        onClick={() => setActiveVisit(visit)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Hapus Log"
                        onClick={() => {
                          if (confirm('Hapus baris kunjungan patroli ini?')) {
                            deleteMutation.mutate(visit.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Pagination meta={data?.pagination} onPageChange={setPage} isLoading={isLoading} />
      </div>

      <IncidentDetailModal
        key={activeVisit?.id || 'incident-modal'}
        visit={activeVisit}
        isOpen={!!activeVisit}
        onClose={() => setActiveVisit(null)}
        onReview={async (id, status) => {
          await reviewMutation.mutateAsync({ id, status });
        }}
      />
    </div>
  );
}
