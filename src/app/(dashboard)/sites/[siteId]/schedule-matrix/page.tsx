'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi } from '@/features/shifts/api';
import { SiteNavigationTabs } from '@/components/sites/SiteNavigationTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Layers,
  Users,
  Sun,
  Moon,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Shift, SiteRosterScheduleItem } from '@/types/shift';

export default function SiteScheduleMatrixPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  // Filter states
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [startDate, setStartDate] = useState(todayStr);
  const [days, setDays] = useState(14);
  const [selectedCellItem, setSelectedCellItem] = useState<{
    officerName: string;
    item: SiteRosterScheduleItem;
  } | null>(null);

  const { data: rosterData, isLoading, error } = useQuery({
    queryKey: ['site-roster', siteId, startDate, days],
    queryFn: () => shiftsApi.getSiteRoster({ siteId, startDate, days }),
    enabled: !!siteId,
  });

  const rosterOfficers = rosterData?.roster || [];

  // Extract all unique dates from the first officer's schedule or generate
  const scheduleDates = useMemo(() => {
    if (rosterOfficers.length > 0 && rosterOfficers[0].schedule.length > 0) {
      return rosterOfficers[0].schedule.map((s) => ({
        date: s.date,
        dayOfWeek: s.dayOfWeek,
        dayName: s.dayName,
      }));
    }
    return [];
  }, [rosterOfficers]);

  // Daily totals summary
  const dailySummary = useMemo(() => {
    const summary: Record<
      string,
      { pagi: number; siang: number; malam: number; normal: number; off: number; unassigned: number }
    > = {};

    scheduleDates.forEach((d) => {
      summary[d.date] = { pagi: 0, siang: 0, malam: 0, normal: 0, off: 0, unassigned: 0 };
    });

    rosterOfficers.forEach((off) => {
      if (off.schedule.length === 0) return;
      off.schedule.forEach((s) => {
        if (!summary[s.date]) return;
        if (s.isOffDay || s.shift?.isOff) {
          summary[s.date].off += 1;
        } else if (s.shift?.code?.includes('PAGI') || s.shift?.name?.toLowerCase().includes('pagi')) {
          summary[s.date].pagi += 1;
        } else if (s.shift?.code?.includes('SIANG') || s.shift?.name?.toLowerCase().includes('siang')) {
          summary[s.date].siang += 1;
        } else if (s.shift?.code?.includes('MALAM') || s.shift?.isOvernight) {
          summary[s.date].malam += 1;
        } else if (s.shift) {
          summary[s.date].normal += 1;
        } else {
          summary[s.date].unassigned += 1;
        }
      });
    });

    return summary;
  }, [rosterOfficers, scheduleDates]);

  // Date Navigation handlers
  const handleShiftPeriod = (direction: 'prev' | 'next') => {
    const current = new Date(startDate);
    const offset = direction === 'prev' ? -days : days;
    current.setDate(current.getDate() + offset);
    setStartDate(current.toISOString().split('T')[0]);
  };

  const handleResetToToday = () => {
    setStartDate(todayStr);
  };

  // Helper for shift badge styling
  const renderShiftCell = (
    item: SiteRosterScheduleItem | undefined,
    officerName: string
  ) => {
    if (!item || (!item.shift && !item.isOffDay)) {
      return (
        <span
          className="inline-block w-full py-1 text-[10px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded text-center"
          title="Belum ada jadwal"
        >
          -
        </span>
      );
    }

    if (item.isOffDay || item.shift?.isOff) {
      return (
        <button
          type="button"
          onClick={() => setSelectedCellItem({ officerName, item })}
          className="w-full py-1 px-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 transition hover:opacity-80 text-center"
        >
          LIBUR
        </button>
      );
    }

    const s = item.shift;
    if (!s) return null;

    let cellClass = 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200';
    let shortName = s.code.replace('DEFAULT_', '').replace('SHIFT_', '');

    if (s.code.includes('PAGI') || s.name.toLowerCase().includes('pagi')) {
      cellClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      shortName = 'PAGI';
    } else if (s.code.includes('SIANG') || s.name.toLowerCase().includes('siang')) {
      cellClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
      shortName = 'SIANG';
    } else if (s.code.includes('MALAM') || s.isOvernight) {
      cellClass = 'bg-indigo-900 text-slate-100 border-indigo-700 dark:bg-slate-900 dark:text-slate-100';
      shortName = 'MALAM';
    } else if (s.code.includes('NORMAL') || s.name.toLowerCase().includes('normal')) {
      cellClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
      shortName = 'NORMAL';
    }

    return (
      <button
        type="button"
        onClick={() => setSelectedCellItem({ officerName, item })}
        className={cn(
          'w-full py-1 px-1 rounded text-[10px] font-semibold border transition hover:opacity-80 text-center shadow-xs',
          cellClass
        )}
      >
        <span>{shortName}</span>
      </button>
    );
  };

  const formatDayNameIndo = (dayOfWeek: number) => {
    const indoDays: Record<number, string> = {
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
      7: 'Minggu',
    };
    return indoDays[dayOfWeek] || '';
  };

  return (
    <div className="space-y-6">
      <SiteNavigationTabs siteId={siteId} />

      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            Matriks Kalender Giliran Shift Situs
          </h2>
          <p className="text-xs text-slate-500">
            Pantau sebaran penugasan satpam di seluruh pos per hari berdasarkan perputaran tim roster dan jam tetap.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="inline-flex rounded-md shadow-xs" role="group">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold border first:rounded-l-md last:rounded-r-md transition',
                  days === d
                    ? 'bg-slate-900 text-slate-50 border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                )}
              >
                {d} Hari
              </button>
            ))}
          </div>

          {/* Date Picker and Prev/Next */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleShiftPeriod('prev')}
              title="Periode Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs font-mono w-36"
            />

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleShiftPeriod('next')}
              title="Periode Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {startDate !== todayStr && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToToday}
                className="text-xs h-8 px-2 text-blue-600"
              >
                Hari Ini
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
          <Info className="h-3.5 w-3.5" /> Keterangan:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-blue-100 border border-blue-300 dark:bg-blue-900" />
          <span>Pagi (07:00 - 15:00)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-purple-100 border border-purple-300 dark:bg-purple-900" />
          <span>Siang (15:00 - 23:00)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-indigo-900 border border-indigo-700" />
          <span>Malam (23:00 - 07:00)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-emerald-100 border border-emerald-300 dark:bg-emerald-900" />
          <span>Normal (07:00 - 17:00)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-slate-200 border border-slate-300 dark:bg-slate-800" />
          <span>Libur (OFF)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs border border-dashed border-slate-400" />
          <span>Belum Ditentukan</span>
        </div>
      </div>

      {/* Calendar Grid Matrix */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="p-10 text-center text-xs text-red-600">
              Gagal memuat matriks kalender jadwal situs.
            </div>
          ) : rosterOfficers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Belum ada data jadwal petugas untuk rentang waktu ini.
              </p>
              <p>
                Pastikan sudah ada petugas yang ditugaskan ke site ini dengan model Tim Roster atau Jam Kerja Tetap.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                    {/* Fixed officer column */}
                    <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900/90 py-3 px-3 min-w-[200px] border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
                      Petugas Lapangan
                    </th>

                    {/* Fixed model column */}
                    <th className="sticky left-[200px] z-20 bg-slate-50 dark:bg-slate-900/90 py-3 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
                      Model / Tim
                    </th>

                    {/* Dynamic Date Columns */}
                    {scheduleDates.map((d) => {
                      const isToday = d.date === todayStr;
                      const isWeekend = d.dayOfWeek === 6 || d.dayOfWeek === 7;
                      return (
                        <th
                          key={d.date}
                          className={cn(
                            'py-2 px-2 text-center min-w-[80px] border-r border-slate-200 dark:border-slate-800',
                            isWeekend && 'bg-slate-100/60 dark:bg-slate-800/40',
                            isToday && 'bg-blue-50/80 dark:bg-blue-950/40 font-bold'
                          )}
                        >
                          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                            {formatDayNameIndo(d.dayOfWeek)}
                          </div>
                          <div
                            className={cn(
                              'text-xs font-mono',
                              isToday ? 'text-blue-600 font-bold' : 'text-slate-900 dark:text-slate-100'
                            )}
                          >
                            {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rosterOfficers.map((officer) => {
                    const scheduleMap = new Map<string, SiteRosterScheduleItem>();
                    officer.schedule.forEach((s) => scheduleMap.set(s.date, s));

                    return (
                      <tr key={officer.user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        {/* Sticky Name column */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {officer.user.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            NIK: {officer.user.employeeId}
                          </div>
                        </td>

                        {/* Sticky Team / Schedule Type column */}
                        <td className="sticky left-[200px] z-10 bg-white dark:bg-slate-900 py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                          {officer.scheduleType === 'ROSTER' ? (
                            <span className="font-semibold text-[11px] text-blue-700 dark:text-blue-300">
                              {officer.rosterTeam?.code || 'ROSTER'}
                            </span>
                          ) : officer.scheduleType === 'FIXED' ? (
                            <span className="font-semibold text-[11px] text-emerald-700 dark:text-emerald-300">
                              Jam Tetap
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Tanpa Jadwal
                            </span>
                          )}
                        </td>

                        {/* Schedule cells per date */}
                        {scheduleDates.map((d) => {
                          const item = scheduleMap.get(d.date);
                          const isWeekend = d.dayOfWeek === 6 || d.dayOfWeek === 7;
                          const isToday = d.date === todayStr;

                          return (
                            <td
                              key={d.date}
                              className={cn(
                                'py-2 px-1.5 text-center border-r border-slate-100 dark:border-slate-800/80',
                                isWeekend && 'bg-slate-50/40 dark:bg-slate-800/20',
                                isToday && 'bg-blue-50/30 dark:bg-blue-950/20'
                              )}
                            >
                              {renderShiftCell(item, officer.user.name)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Summary row: Daily headcount */}
                  <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 font-semibold">
                    <td
                      colSpan={2}
                      className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/90 py-3 px-3 text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800"
                    >
                      <div className="font-bold">Total Petugas Dinas Harian</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        Rekapitulasi kesiapan jaga
                      </div>
                    </td>

                    {scheduleDates.map((d) => {
                      const stats = dailySummary[d.date];
                      const totalOnDuty = (stats?.pagi || 0) + (stats?.siang || 0) + (stats?.malam || 0) + (stats?.normal || 0);

                      return (
                        <td
                          key={d.date}
                          className="py-2 px-1 text-center border-r border-slate-200 dark:border-slate-800 text-[11px]"
                        >
                          <div className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {totalOnDuty}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono">
                            OFF: {stats?.off || 0}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Shift Detail Popover / Card */}
      {selectedCellItem && (
        <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Detail Jadwal: {selectedCellItem.officerName} ({selectedCellItem.item.date})
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                {selectedCellItem.item.isOffDay || selectedCellItem.item.shift?.isOff ? (
                  <span>Petugas dijadwalkan Libur Dinas (OFF) pada hari ini.</span>
                ) : (
                  <span>
                    Shift: <strong>{selectedCellItem.item.shift?.name}</strong> ({selectedCellItem.item.shift?.startTime?.slice(0, 5)} - {selectedCellItem.item.shift?.endTime?.slice(0, 5)} WIB).
                    Toleransi keterlambatan {selectedCellItem.item.shift?.lateToleranceMinutes ?? 15} menit.
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCellItem(null)}
              className="text-xs self-start sm:self-center"
            >
              Tutup
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
