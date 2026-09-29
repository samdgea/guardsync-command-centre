'use client';

import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { SiteComplianceData } from '@/types/report';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  Clock,
  Search,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Radio,
} from 'lucide-react';

interface ComplianceChartProps {
  site?: SiteComplianceData;
}

export function ComplianceChart({ site }: ComplianceChartProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');

  const checkpoints = site?.checkpoints || [];
  const total = checkpoints.length;
  const visited = checkpoints.filter((c) => c.visited).length;
  const unvisited = total - visited;
  const complianceRate = total > 0 ? Math.round((visited / total) * 100) : 0;

  const chartData = useMemo(() => {
    if (total === 0) return [];
    return [
      { name: 'Sudah Dikunjungi', value: visited, color: '#10b981' },
      { name: 'Belum Dikunjungi', value: unvisited, color: '#f59e0b' },
    ];
  }, [visited, unvisited, total]);

  const filteredCheckpoints = useMemo(() => {
    return checkpoints.filter((c) => {
      const matchSearch =
        c.checkpointName.toLowerCase().includes(search.toLowerCase()) ||
        c.checkpointCode.toLowerCase().includes(search.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (filterStatus === 'VISITED') return c.visited;
      if (filterStatus === 'UNVISITED') return !c.visited;
      return true;
    });
  }, [checkpoints, search, filterStatus]);

  if (!site) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        Data kepatuhan situs belum tersedia.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Visual: Progress Donut & Site Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  Tingkat Kepatuhan Patroli Pos: {site.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  Rasio checkpoint yang berhasil dikunjungi sesuai SLA jadwal
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-1 ${
                  complianceRate >= 85
                    ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {complianceRate >= 85 ? (
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600 inline" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-600 inline" />
                )}
                {complianceRate >= 85 ? 'Memenuhi Standar SLA (≥85%)' : 'Di Bawah Standar SLA (<85%)'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {total === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Belum ada checkpoint yang terdaftar pada situs ini.
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center justify-around gap-6 pt-2">
                <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        innerRadius={56}
                        outerRadius={78}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {chartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50">
                      {complianceRate}%
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Kepatuhan
                    </span>
                  </div>
                </div>

                <div className="space-y-4 w-full max-w-sm">
                  <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Sudah Dikunjungi
                        </p>
                        <p className="text-[11px] text-slate-500">Scan pos berhasil terekam</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {visited}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Belum Dikunjungi
                        </p>
                        <p className="text-[11px] text-slate-500">Pos belum terverifikasi</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                      {unvisited}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Site Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Detail Situs
            </CardTitle>
            <CardDescription className="text-xs">Informasi lokasi dan radius operasional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs">
            <div>
              <p className="text-slate-500 font-medium text-[11px]">Nama & Kode Situs</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {site.name} ({site.code})
              </p>
            </div>

            {site.address && (
              <div>
                <p className="text-slate-500 font-medium text-[11px]">Alamat Lengkap</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {site.address}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p className="text-slate-500 font-medium text-[11px]">Radius Geofence</p>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {site.radiusMeters ? `${site.radiusMeters} meter` : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium text-[11px]">Status Operasional</p>
                <div className="mt-0.5">
                  {site.active !== false ? (
                    <Badge variant="aman" className="text-[10px] px-1.5 py-0">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="pending" className="text-[10px] px-1.5 py-0">
                      Nonaktif
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {site.latitude !== null && site.latitude !== undefined && (
              <div>
                <p className="text-slate-500 font-medium text-[11px]">Koordinat Pusat</p>
                <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {site.latitude.toFixed(6)}, {site.longitude?.toFixed(6)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkpoints Breakdown Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">
                Daftar Checkpoint & Status Kunjungan
              </CardTitle>
              <CardDescription className="text-xs">
                Rincian audit status scan setiap titik checkpoint di {site.name}
              </CardDescription>
            </div>

            {/* Quick status tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filterStatus === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua ({total})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('VISITED')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filterStatus === 'VISITED'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Sudah Dikunjungi ({visited})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('UNVISITED')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filterStatus === 'UNVISITED'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Belum Dikunjungi ({unvisited})
              </button>
            </div>
          </div>

          <div className="pt-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Cari pos atau kode checkpoint..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredCheckpoints.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {search
                ? 'Tidak ada checkpoint yang sesuai dengan kata kunci pencarian.'
                : 'Tidak ada checkpoint untuk kategori status ini.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Kode Pos</th>
                    <th className="py-2.5 px-3">Nama Checkpoint</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 text-right">Status Kepatuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredCheckpoints.map((cp, idx) => (
                    <tr
                      key={cp.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {cp.checkpointCode}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {cp.checkpointName}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {cp.description || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {cp.visited ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 dark:border-emerald-800 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-medium inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                            Sudah Dikunjungi
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-300 dark:border-amber-800 bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-medium inline-flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                            Belum Dikunjungi
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
