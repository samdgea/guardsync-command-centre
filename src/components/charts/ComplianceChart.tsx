'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { ComplianceReport } from '@/types/report';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface ComplianceChartProps {
  compliance?: ComplianceReport;
}

export function ComplianceChart({ compliance }: ComplianceChartProps) {
  if (!compliance) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Data kepatuhan belum tersedia.
      </div>
    );
  }

  const siteData = (compliance.bySite || []).map((s) => ({
    name: s.siteName,
    complianceRate: s.complianceRate ?? 0,
    visits: s.visits ?? 0,
    checkpoints: s.checkpoints ?? 0,
  }));

  const officerData = (compliance.byOfficer || []).map((o) => ({
    name: o.officerName,
    visits: o.visits ?? 0,
    onTime: o.onTime ?? 0,
    punctuality: (o.visits ?? 0) > 0 ? Math.round(((o.onTime ?? 0) / o.visits) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Site Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tingkat Kepatuhan Patroli per Situs (%)</CardTitle>
          <CardDescription className="text-xs">
            Persentase checkpoint yang berhasil dikunjungi sesuai SLA jadwal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={siteData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Kepatuhan']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="complianceRate" radius={[4, 4, 0, 0]}>
                  {siteData.map((entry, idx) => (
                    <Cell
                      key={`site-${idx}`}
                      fill={entry.complianceRate >= 85 ? '#16a34a' : '#d97706'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Officer Punctuality */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ketepatan Waktu Kunjungan per Petugas</CardTitle>
          <CardDescription className="text-xs">
            Perbandingan total kunjungan dengan kunjungan tepat waktu (on-time)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={officerData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="visits" name="Total Kunjungan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="onTime" name="Tepat Waktu" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
