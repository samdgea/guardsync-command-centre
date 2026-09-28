'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { patrolSessionsApi } from '@/features/patrol-sessions/api';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { LivePatrolMap } from '@/components/map/LivePatrolMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function MonitoringMapPage() {
  const selectedSiteId = useSiteContextStore((s) => s.selectedSiteId);

  const {
    data: sessions = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['monitoring-active-sessions'],
    queryFn: () => patrolSessionsApi.getActiveSessions(),
    refetchInterval: 12000,
  });

  const filteredSessions = React.useMemo(() => {
    if (!selectedSiteId) return sessions;
    return sessions.filter((s) => s.siteId === selectedSiteId);
  }, [sessions, selectedSiteId]);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            Pemantauan Patroli Realtime
          </h1>
          <p className="text-xs text-slate-500">
            Pelacakan GPS sesi patroli satpam di lapangan (pembaruan otomatis setiap 12 detik).
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
            Segarkan Peta
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        <div className="lg:col-span-1 flex flex-col h-full overflow-hidden border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Sesi Aktif ({filteredSessions.length})
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <div className="text-xs text-slate-400 text-center py-6">Memuat sesi aktif...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 space-y-1">
                <ShieldCheck className="h-6 w-6 text-slate-400 mx-auto" />
                <p className="font-semibold">Tidak ada sesi aktif</p>
                <p className="text-[11px] text-slate-400">
                  Semua petugas sedang tidak dalam status patroli.
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {session.name}
                    </span>
                    <Badge variant="aman" className="text-[10px]">
                      LIVE
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">{session.code}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="h-3 w-3" />
                    Mulai: {formatDate(session.startedAt)}
                  </div>
                  {session.latitude && session.longitude ? (
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      GPS Terlacak: {session.latitude}, {session.longitude}
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-500 italic">
                      Koordinat GPS belum dikirim
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-3 h-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
          <LivePatrolMap sessions={filteredSessions} />
        </div>
      </div>
    </div>
  );
}