'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { ReportSummary } from '@/types/report';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SummaryChartsProps {
  summary?: ReportSummary;
}

const CONDITION_COLORS: Record<string, string> = {
  AMAN: '#16a34a',
  WASPADA: '#d97706',
  DARURAT: '#dc2626',
};

const REVIEW_COLORS: Record<string, string> = {
  PENDING: '#64748b',
  REVIEWED: '#2563eb',
  ACKNOWLEDGED: '#4f46e5',
  ESCALATED: '#9333ea',
  RESOLVED: '#0d9488',
};

export function SummaryCharts({ summary }: SummaryChartsProps) {
  if (!summary) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Data ringkasan tidak tersedia.
      </div>
    );
  }

  const byCondition = summary.byCondition || { AMAN: 0, WASPADA: 0, DARURAT: 0 };
  const byReviewStatus = summary.byReviewStatus || {};

  const conditionData = [
    { name: 'AMAN', value: byCondition.AMAN ?? 0, color: CONDITION_COLORS.AMAN },
    { name: 'WASPADA', value: byCondition.WASPADA ?? 0, color: CONDITION_COLORS.WASPADA },
    { name: 'DARURAT', value: byCondition.DARURAT ?? 0, color: CONDITION_COLORS.DARURAT },
  ];

  const reviewData = Object.entries(byReviewStatus).map(([status, count]) => ({
    status,
    count: Number(count) || 0,
    color: REVIEW_COLORS[status] || '#64748b',
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Condition Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Distribusi Kondisi Kunjungan</CardTitle>
          <CardDescription className="text-xs">
            Rincian status keamanan checkpoint berdasarkan hasil audit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conditionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {conditionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} kunjungan`, 'Total']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Review Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Status Tindak Lanjut Review</CardTitle>
          <CardDescription className="text-xs">
            Disposisi review verifikasi oleh supervisor & admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [`${value} laporan`, 'Jumlah']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {reviewData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
