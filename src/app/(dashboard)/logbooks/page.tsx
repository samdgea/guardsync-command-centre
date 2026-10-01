'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logbooksApi } from '@/features/logbooks/api';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { LogBookStatus } from '@/types/logbook';
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
import { BookOpen, User, Eye, Filter } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function LogbooksPage() {
  const selectedSiteId = useSiteContextStore((s) => s.selectedSiteId);
  const sitesList = useSiteContextStore((s) => s.sitesList);

  const [page, setPage] = useState(1);
  const [filterSiteId, setFilterSiteId] = useState(selectedSiteId || '');
  const [status, setStatus] = useState<LogBookStatus | ''>('');
  const [date, setDate] = useState('');

  React.useEffect(() => {
    if (selectedSiteId) {
      setFilterSiteId(selectedSiteId);
    }
  }, [selectedSiteId]);

  const { data, isLoading } = useQuery({
    queryKey: ['logbooks-list', page, filterSiteId, status, date],
    queryFn: () =>
      logbooksApi.getLogBooks({
        page,
        limit: 10,
        siteId: filterSiteId || undefined,
        status: status || undefined,
        date: date || undefined,
      }),
  });

  const logbooks = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Digital Mutasi & Buku Serah Terima Shift
          </h1>
          <p className="text-sm text-slate-500">
            Pengawasan buku mutasi pergantian tugas jaga pos, cek fisik inventaris, dan rekap kejadian harian.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Filter Mutasi:
        </span>

        <div className="flex items-center gap-2">
          <span>Situs:</span>
          <select
            value={filterSiteId}
            onChange={(e) => setFilterSiteId(e.target.value)}
            className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs"
          >
            <option value="">Semua Situs</option>
            {sitesList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>Status:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">ACTIVE (Sedang Berjalan)</option>
            <option value="CLOSED">CLOSED (Tutup Shift)</option>
            <option value="ACCEPTED">ACCEPTED (Diterima Shift Lanjutan)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>Tanggal:</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-xs w-36"
          />
        </div>

        {(filterSiteId || status || date) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterSiteId('');
              setStatus('');
              setDate('');
            }}
            className="text-xs text-slate-500"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : logbooks.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            Tidak ada buku mutasi ditemukan sesuai kriteria filter.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Jaga</TableHead>
                <TableHead>Petugas Pembuat (Buka Shift)</TableHead>
                <TableHead>Penerima Mutasi (Shift Berikutnya)</TableHead>
                <TableHead>Waktu Buka</TableHead>
                <TableHead>Waktu Tutup</TableHead>
                <TableHead>Status Mutasi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logbooks.map((lb) => {
                const statusVariant =
                  lb.status === 'ACCEPTED'
                    ? 'aman'
                    : lb.status === 'ACTIVE'
                    ? 'reviewed'
                    : 'secondary';

                return (
                  <TableRow key={lb.id}>
                    <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      Shift {lb.shift}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {lb.createdBy?.name || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {lb.acceptedBy?.name ? (
                        <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {lb.acceptedBy.name}
                        </div>
                      ) : (
                        <span className="italic text-slate-400">Menunggu serah terima</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {formatDate(lb.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {lb.acceptedAt ? formatDate(lb.acceptedAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant} className="text-[10px] uppercase">
                        {lb.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/logbooks/${lb.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          Buka Detail
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Pagination meta={data?.pagination} onPageChange={setPage} isLoading={isLoading} />
      </div>
    </div>
  );
}