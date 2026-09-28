'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/features/reports/api';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { SummaryCharts } from '@/components/charts/SummaryCharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function ReportsSummaryPage() {
  const selectedSiteId = useSiteContextStore((s) => s.selectedSiteId);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: summary, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reports-summary-page', selectedSiteId, fromDate, toDate],
    queryFn: () =>
      reportsApi.getSummary({
        siteId: selectedSiteId || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Ringkasan & Analitik Patroli
          </h1>
          <p className="text-sm text-slate-500">
            Visualisasi distribusi kondisi temuan pos dan efektivitas review penanganan insiden.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          <Link href="/reports/compliance">
            <Button size="sm" className="text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Laporan Kepatuhan Jadwal
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Filter Rentang Waktu:
        </span>
        <div className="flex items-center gap-2">
          <span>Dari:</span>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-xs w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <span>Sampai:</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-xs w-40"
          />
        </div>
        {(fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFromDate('');
              setToDate('');
            }}
            className="text-xs text-slate-500"
          >
            Reset
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <SummaryCharts summary={summary} />
      )}

      <Card className="bg-slate-50 dark:bg-slate-900/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Lakukan Audit Lebih Mendalam di Review Desk
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Lihat daftar setiap scan satuan, foto resolusi tinggi, koordinat GPS, dan log riwayat penanganan insiden.
          </p>
        </div>
        <Link href="/reports/visits">
          <Button variant="default" size="sm" className="text-xs">
            Buka Review Desk Kunjungan
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </Card>
    </div>
  );
}
