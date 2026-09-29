'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/features/reports/api';
import { sitesApi } from '@/features/sites/api';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { ComplianceChart } from '@/components/charts/ComplianceChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  Calendar,
  ArrowLeft,
  RefreshCw,
  CheckCheck,
  Clock,
  Building2,
  Percent,
} from 'lucide-react';
import Link from 'next/link';

export default function ComplianceReportPage() {
  const selectedSiteId = useSiteContextStore((s) => s.selectedSiteId);
  const setSelectedSiteId = useSiteContextStore((s) => s.setSelectedSiteId);
  const sitesList = useSiteContextStore((s) => s.sitesList);

  const { data: sitesData, isLoading: isLoadingSites } = useQuery({
    queryKey: ['sites', 'compliance-page'],
    queryFn: () => sitesApi.getSites({ limit: 100 }),
    enabled: sitesList.length === 0,
  });

  const availableSites = sitesList.length > 0 ? sitesList : sitesData?.data || [];

  const [siteId, setSiteId] = useState<string>(selectedSiteId || availableSites[0]?.id || '');
  const [date, setDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (selectedSiteId) {
      setSiteId(selectedSiteId);
    } else if (availableSites.length > 0 && !siteId) {
      setSiteId(availableSites[0].id);
    }
  }, [selectedSiteId, availableSites, siteId]);

  const currentSite = availableSites.find((s) => s.id === siteId);

  const {
    data: complianceList = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['reports-compliance', siteId, date, fromDate, toDate],
    queryFn: () =>
      reportsApi.getCompliance({
        siteId: siteId || undefined,
        date: date || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
      }),
    enabled: !!siteId,
  });

  const currentSiteCompliance =
    complianceList.find((s) => s.id === siteId) || complianceList[0];

  const checkpoints = currentSiteCompliance?.checkpoints || [];
  const totalCheckpoints = checkpoints.length;
  const visitedCount = checkpoints.filter((c) => c.visited).length;
  const unvisitedCount = totalCheckpoints - visitedCount;
  const complianceRate =
    totalCheckpoints > 0 ? Math.round((visitedCount / totalCheckpoints) * 100) : 0;

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
              {currentSite
                ? `Evaluasi status kunjungan checkpoint dan kepatuhan patroli di ${currentSite.name}.`
                : 'Evaluasi status kunjungan checkpoint dan kepatuhan patroli per situs.'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching || !siteId}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-slate-500" />
            Situs:
          </span>
          <select
            value={siteId}
            onChange={(e) => {
              const val = e.target.value;
              setSiteId(val);
              setSelectedSiteId(val || null);
            }}
            disabled={isLoadingSites && availableSites.length === 0}
            className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-medium cursor-pointer"
          >
            {availableSites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

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

      {!siteId ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          Silakan pilih situs untuk melihat laporan kepatuhan jadwal patroli.
        </Card>
      ) : (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                  Total Checkpoint
                </CardTitle>
                <CheckCheck className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold font-mono">
                    {totalCheckpoints}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">Titik pos pengawasan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                  Sudah Dikunjungi
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {visitedCount}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">Pos berhasil discan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                  Belum Dikunjungi
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {unvisitedCount}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">Pos menunggu patroli</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                  Tingkat Kepatuhan
                </CardTitle>
                <Percent className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div
                    className={`text-2xl font-bold font-mono ${
                      complianceRate >= 85
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {complianceRate}%
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">Sesuai standar operasional SLA</p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          ) : (
            <ComplianceChart site={currentSiteCompliance} />
          )}
        </>
      )}
    </div>
  );
}
