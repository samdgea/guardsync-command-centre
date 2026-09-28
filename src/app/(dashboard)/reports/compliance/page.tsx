'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/features/reports/api';
import { ComplianceChart } from '@/components/charts/ComplianceChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Calendar, ArrowLeft, RefreshCw, CheckCheck, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ComplianceReportPage() {
  const [date, setDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: compliance, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reports-compliance', date, fromDate, toDate],
    queryFn: () =>
      reportsApi.getCompliance({
        date: date || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Kembali ke Ringkasan Laporan
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              Laporan Kepatuhan Jadwal Patroli
            </h1>
            <p className="text-sm text-slate-500">
              Evaluasi kedisiplinan checkpoint dan ketepatan waktu kunjungan petugas satpam.
            </p>
          </div>

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
        </div>
      </div>

      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-slate-500" />
          Filter Tanggal:
        </span>
        <div className="flex items-center gap-2">
          <span>Hari Tertentu:</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setFromDate('');
              setToDate('');
            }}
            className="h-8 text-xs w-40"
          />
        </div>
        <span className="text-slate-400">atau</span>
        <div className="flex items-center gap-2">
          <span>Rentang:</span>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setDate('');
            }}
            className="h-8 text-xs w-36"
          />
          <span>-</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setDate('');
            }}
            className="h-8 text-xs w-36"
          />
        </div>
        {(date || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDate('');
              setFromDate('');
              setToDate('');
            }}
            className="text-xs text-slate-500"
          >
            Reset Filter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Total Checkpoint Dipatroli
            </CardTitle>
            <CheckCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {compliance?.totalCheckpoints ?? 0}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Titik pos pengawasan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Total Kunjungan Masuk
            </CardTitle>
            <Clock className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {compliance?.totalVisits ?? 0}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Scan berhasil terekam</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Rata-Rata Kepatuhan
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {compliance?.bySite && compliance.bySite.length > 0
                  ? Math.round(
                      compliance.bySite.reduce((acc, curr) => acc + curr.complianceRate, 0) /
                        compliance.bySite.length
                    )
                  : 100}
                %
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Sesuai standar operasional</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <ComplianceChart compliance={compliance} />
      )}
    </div>
  );
}
