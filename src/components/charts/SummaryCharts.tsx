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
import { AlertCircle } from 'lucide-react';

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

  const totalConditions = conditionData.reduce((acc, curr) => acc + curr.value, 0);
  const activeConditionData = conditionData.filter((entry) => entry.value > 0);

  const reviewData = Object.entries(byReviewStatus).map(([status, count]) => ({
    status,
    count: Number(count) || 0,
    color: REVIEW_COLORS[status] || '#64748b',
  }));

  const totalReviews = reviewData.reduce((acc, curr) => acc + curr.count, 0);

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
          {totalConditions === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
              <AlertCircle className="h-6 w-6 mb-2 text-slate-300 dark:text-slate-700" />
              Belum ada data distribusi kondisi patroli pada rentang waktu ini.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeConditionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={activeConditionData.length > 1 ? 4 : 0}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {activeConditionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} kunjungan`, 'Total']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    itemStyle={{
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                    labelStyle={{
                      color: '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    payload={conditionData.map((item) => ({
                      value: `${item.name} (${item.value})`,
                      type: 'circle',
                      color: item.color,
                      id: item.name,
                    }))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
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
          {totalReviews === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
              <AlertCircle className="h-6 w-6 mb-2 text-slate-300 dark:text-slate-700" />
              Belum ada data status review verifikasi pada rentang waktu ini.
            </div>
          ) : (
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
                      border: '1px solid #334155',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    itemStyle={{
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                    labelStyle={{
                      color: '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
