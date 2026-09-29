'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/features/reports/api';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { SummaryCharts } from '@/components/charts/SummaryCharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Activity, Calendar, ShieldCheck, Clock } from 'lucide-react';
import Link from 'next/link';

function formatDateInput(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return {
    from: formatDateInput(start),
    to: formatDateInput(end),
  };
}

export default function ReportsSummaryPage() {
  const selectedSiteId = useSiteContextStore((s) => s.selectedSiteId);
  const [fromDate, setFromDate] = useState(() => getDefaultDateRange().from);
  const [toDate, setToDate] = useState(() => getDefaultDateRange().to);

  const { data: summary, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reports-summary-page', selectedSiteId, fromDate, toDate],
    queryFn: () => {
      let fromIso: string | undefined = undefined;
      let toIso: string | undefined = undefined;

      if (fromDate) {
        const fromD = new Date(`${fromDate}T00:00:00`);
        fromIso = !isNaN(fromD.getTime()) ? fromD.toISOString() : undefined;
      }

      if (toDate) {
        const toD = new Date(`${toDate}T23:59:59.999`);
        toIso = !isNaN(toD.getTime()) ? toD.toISOString() : undefined;
      }

      return reportsApi.getSummary({
        siteId: selectedSiteId || undefined,
        from: fromIso,
        to: toIso,
      });
    },
  });

  const handleSet7Days = () => {
    const range = getDefaultDateRange();
    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleResetFilter = () => {
    setFromDate('');
    setToDate('');
  };

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
        <Button
          variant="outline"
          size="sm"
          onClick={handleSet7Days}
          className="text-xs h-8"
        >
          7 Hari Terakhir
        </Button>
        {(fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilter}
            className="text-xs text-slate-500 h-8"
          >
            Hapus Filter
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                  Total Kunjungan
                </CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">
                  {summary?.totalVisits ?? summary?.total ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akumulasi seluruh scan patroli
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                  Kunjungan Hari Ini
                </CardTitle>
                <Calendar className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {summary?.today ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Scan selesai hari ini
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                  Sesi Patroli Aktif
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {summary?.activeSessions ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sedang berlangsung di lapangan
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                  Menunggu Review
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {summary?.pending ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Perlu disposisi supervisor
                </p>
              </CardContent>
            </Card>
          </div>

          <SummaryCharts summary={summary} />
        </div>
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
