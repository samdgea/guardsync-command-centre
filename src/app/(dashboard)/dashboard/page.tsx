'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { reportsApi } from '@/features/reports/api';
import { patrolSessionsApi } from '@/features/patrol-sessions/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Clock,
  MapPin,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { IncidentDetailModal } from '@/components/report/IncidentDetailModal';
import { PatrolVisit, ReviewStatus } from '@/types/report';

export default function DashboardPage() {
  const selectedSiteId = useSiteContextStore((s) => s.selectedSiteId);
  const [selectedVisit, setSelectedVisit] = useState<PatrolVisit | null>(null);

  // 1. Fetch Report Summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['reports-summary', selectedSiteId],
    queryFn: () => reportsApi.getSummary({ siteId: selectedSiteId || undefined }),
    refetchInterval: 30000,
  });

  // 2. Fetch Active Patrol Sessions
  const {
    data: activeSessions,
    isLoading: isSessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['active-patrol-sessions'],
    queryFn: () => patrolSessionsApi.getActiveSessions(),
    refetchInterval: 15000,
  });

  // 3. Fetch Quick Alert Feed (Waspada & Darurat visits)
  const {
    data: alertsData,
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['quick-alert-feed', selectedSiteId],
    queryFn: () =>
      reportsApi.getVisits({
        siteId: selectedSiteId || undefined,
        limit: 8,
      }),
    refetchInterval: 20000,
  });

  const incidentVisits = React.useMemo(() => {
    if (!alertsData?.data || !Array.isArray(alertsData.data)) return [];
    return alertsData.data.filter(
      (v) => v.condition === 'DARURAT' || v.condition === 'WASPADA'
    );
  }, [alertsData]);

  const filteredSessions = React.useMemo(() => {
    if (!activeSessions) return [];
    if (!selectedSiteId) return activeSessions;
    return activeSessions.filter((s) => s.siteId === selectedSiteId);
  }, [activeSessions, selectedSiteId]);

  const handleManualRefresh = () => {
    refetchSummary();
    refetchSessions();
    refetchAlerts();
  };

  const handleReviewAction = async (id: string, status: ReviewStatus) => {
    await reportsApi.reviewVisit(id, { status });
    refetchAlerts();
    refetchSummary();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Live Command Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pemantauan langsung operasional satpam, insiden lapangan, dan sesi aktif.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Segarkan Data
          </Button>
          <Link href="/monitoring/map">
            <Button size="sm" className="text-xs">
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              Buka Peta Realtime
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Total Kunjungan Patroli
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {summary?.totalVisits ?? 0}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Kondisi Aman: {summary?.byCondition?.AMAN ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Insiden Darurat
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                {summary?.byCondition?.DARURAT ?? 0}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Perlu respons cepat</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Peringatan Waspada
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {summary?.byCondition?.WASPADA ?? 0}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Perlu pengawasan berkala</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Sesi Patroli Aktif
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {isSessionsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {filteredSessions.length}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Petugas sedang berpatroli</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Active Patrol Sessions + Quick Alert Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Sesi Patroli yang Berlangsung
              </h2>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <Link
              href="/monitoring/map"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              Lihat di Peta
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isSessionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <Card className="p-8 text-center bg-slate-50 dark:bg-slate-900/40">
              <ShieldCheck className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Tidak ada sesi patroli aktif saat ini.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Sesi baru akan muncul otomatis saat petugas memulai scan patroli.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSessions.map((session) => (
                <Card
                  key={session.id}
                  className="hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold">{session.name}</CardTitle>
                        <CardDescription className="text-xs font-mono">
                          {session.code}
                        </CardDescription>
                      </div>
                      <Badge variant="aman" className="text-[10px] uppercase">
                        Aktif
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      Dimulai: {formatDate(session.startedAt)}
                    </div>
                    {session.latitude && session.longitude && (
                      <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {session.latitude}, {session.longitude}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alert Feed (Anomali)
            </h2>
            <Link
              href="/reports/visits"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Semua Laporan
            </Link>
          </div>

          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            {isAlertsLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : incidentVisits.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <ShieldCheck className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                Tidak ada temuan Waspada / Darurat baru.
              </div>
            ) : (
              incidentVisits.map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => setSelectedVisit(visit)}
                  className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={visit.condition === 'DARURAT' ? 'darurat' : 'waspada'}
                      className="text-[10px] uppercase font-bold"
                    >
                      {visit.condition}
                    </Badge>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(visit.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {visit.checkpoint?.name || 'Checkpoint'}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {visit.notes || 'Tanpa catatan tertulis.'}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Oleh: {visit.user?.name || visit.officer?.name || 'Satpam'}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      Buka Rincian →
                    </span>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      <IncidentDetailModal
        visit={selectedVisit}
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        onReview={handleReviewAction}
      />
    </div>
  );
}