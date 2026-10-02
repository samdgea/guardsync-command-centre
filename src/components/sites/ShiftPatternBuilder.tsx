'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi } from '@/features/shifts/api';
import { Shift } from '@/types/shift';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, ArrowLeft, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShiftPatternBuilderProps {
  siteId?: string;
  value: string[];
  onChange: (pattern: string[]) => void;
  availableShifts?: Shift[];
}

export function ShiftPatternBuilder({
  siteId,
  value,
  onChange,
  availableShifts: propShifts,
}: ShiftPatternBuilderProps) {
  const { data: fetchedShiftsData } = useQuery({
    queryKey: ['shifts-list', siteId],
    queryFn: () => shiftsApi.getShifts({ siteId, active: true }),
    enabled: !propShifts,
  });

  const shifts: Shift[] = useMemo(() => {
    return propShifts || fetchedShiftsData?.data || [];
  }, [propShifts, fetchedShiftsData]);

  // Map to quickly look up shift by code or id
  const shiftMap = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach((s) => {
      map.set(s.code, s);
      map.set(s.id, s);
    });
    return map;
  }, [shifts]);

  const addShift = (codeOrId: string) => {
    onChange([...value, codeOrId]);
  };

  const removeShift = (index: number) => {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  };

  const moveShift = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= value.length) return;
    const next = [...value];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    onChange(next);
  };

  const applyPreset = (presetPattern: string[]) => {
    onChange(presetPattern);
  };

  // Helper to determine badge styling based on shift code or properties
  const getShiftBadgeStyle = (codeOrId: string) => {
    const s = shiftMap.get(codeOrId);
    if (!s) {
      if (codeOrId.includes('OFF') || codeOrId.includes('LIBUR')) {
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      }
      return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200';
    }

    if (s.isOff || s.code.includes('OFF')) {
      return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
    if (s.code.includes('PAGI') || s.name.toLowerCase().includes('pagi')) {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    }
    if (s.code.includes('SIANG') || s.name.toLowerCase().includes('siang')) {
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
    }
    if (s.code.includes('MALAM') || s.name.toLowerCase().includes('malam') || s.isOvernight) {
      return 'bg-indigo-900 text-slate-100 border-indigo-700 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700';
    }
    if (s.code.includes('NORMAL') || s.name.toLowerCase().includes('normal')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    }

    return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200';
  };

  const getShiftLabel = (codeOrId: string) => {
    const s = shiftMap.get(codeOrId);
    if (!s) {
      if (codeOrId === 'DEFAULT_OFF_DAY') return 'Hari Libur';
      if (codeOrId === 'DEFAULT_SHIFT_PAGI') return 'Shift Pagi (07:00)';
      if (codeOrId === 'DEFAULT_SHIFT_SIANG') return 'Shift Siang (15:00)';
      if (codeOrId === 'DEFAULT_SHIFT_MALAM') return 'Shift Malam (23:00)';
      if (codeOrId === 'DEFAULT_SHIFT_NORMAL') return 'Shift Normal (07:00)';
      return codeOrId;
    }
    if (s.isOff) return s.name || 'Hari Libur';
    const timeStr = s.startTime && s.endTime ? ` (${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)})` : '';
    return `${s.name}${timeStr}`;
  };

  // Preset options
  const presets = [
    {
      label: '2 Pagi, 2 Malam, 2 Libur (6 Hari)',
      pattern: [
        'DEFAULT_SHIFT_PAGI',
        'DEFAULT_SHIFT_PAGI',
        'DEFAULT_SHIFT_MALAM',
        'DEFAULT_SHIFT_MALAM',
        'DEFAULT_OFF_DAY',
        'DEFAULT_OFF_DAY',
      ],
    },
    {
      label: '2 Malam, 2 Libur, 2 Pagi (Rotasi Tim B)',
      pattern: [
        'DEFAULT_SHIFT_MALAM',
        'DEFAULT_SHIFT_MALAM',
        'DEFAULT_OFF_DAY',
        'DEFAULT_OFF_DAY',
        'DEFAULT_SHIFT_PAGI',
        'DEFAULT_SHIFT_PAGI',
      ],
    },
    {
      label: '2 Libur, 2 Pagi, 2 Malam (Rotasi Tim C)',
      pattern: [
        'DEFAULT_OFF_DAY',
        'DEFAULT_OFF_DAY',
        'DEFAULT_SHIFT_PAGI',
        'DEFAULT_SHIFT_PAGI',
        'DEFAULT_SHIFT_MALAM',
        'DEFAULT_SHIFT_MALAM',
      ],
    },
    {
      label: '3 Shift 8 Jam (Pagi, Siang, Malam, Libur)',
      pattern: [
        'DEFAULT_SHIFT_PAGI',
        'DEFAULT_SHIFT_SIANG',
        'DEFAULT_SHIFT_MALAM',
        'DEFAULT_OFF_DAY',
      ],
    },
  ];

  const offDaysCount = value.filter((c) => {
    const s = shiftMap.get(c);
    return s?.isOff || c.includes('OFF') || c.includes('LIBUR');
  }).length;
  const workDaysCount = value.length - offDaysCount;

  return (
    <div className="space-y-3">
      {/* Quick Add Shift Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mr-1">
          Tambah ke urutan:
        </span>
        {shifts.length > 0 ? (
          shifts.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => addShift(s.code || s.id)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition hover:opacity-80 active:scale-95',
                getShiftBadgeStyle(s.code || s.id)
              )}
            >
              <Plus className="h-3 w-3" />
              <span>{s.name}</span>
            </button>
          ))
        ) : (
          <>
            <button
              type="button"
              onClick={() => addShift('DEFAULT_SHIFT_PAGI')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-blue-200 bg-blue-50 text-blue-700"
            >
              <Plus className="h-3 w-3" /> Pagi
            </button>
            <button
              type="button"
              onClick={() => addShift('DEFAULT_SHIFT_SIANG')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-purple-200 bg-purple-50 text-purple-700"
            >
              <Plus className="h-3 w-3" /> Siang
            </button>
            <button
              type="button"
              onClick={() => addShift('DEFAULT_SHIFT_MALAM')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-indigo-700 bg-indigo-900 text-slate-100"
            >
              <Plus className="h-3 w-3" /> Malam
            </button>
            <button
              type="button"
              onClick={() => addShift('DEFAULT_OFF_DAY')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-slate-300 bg-slate-100 text-slate-700"
            >
              <Plus className="h-3 w-3" /> Libur
            </button>
          </>
        )}
      </div>

      {/* Preset Selector */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" /> Template Pola:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p.pattern)}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
            >
              {p.label}
            </button>
          ))}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] px-2 py-0.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium transition flex items-center gap-0.5"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Kosongkan
            </button>
          )}
        </div>
      </div>

      {/* Sequence visualizer container */}
      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 min-h-[90px] flex flex-col justify-center">
        {value.length === 0 ? (
          <div className="text-center py-2 text-xs text-slate-400">
            Belum ada giliran shift dalam pola ini. Klik tombol tambah shift di atas atau pilih template pola.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {value.map((codeOrId, index) => (
                <div
                  key={`${codeOrId}-${index}`}
                  className={cn(
                    'group relative inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md border text-xs font-semibold shadow-sm transition',
                    getShiftBadgeStyle(codeOrId)
                  )}
                >
                  <span className="text-[10px] opacity-75 font-mono">H-{index + 1}:</span>
                  <span>{getShiftLabel(codeOrId)}</span>

                  {/* Ordering and remove controls */}
                  <div className="inline-flex items-center gap-0.5 ml-1 pl-1 border-l border-current/20">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveShift(index, 'left')}
                      className="h-4 w-4 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 flex items-center justify-center"
                      title="Geser ke kiri"
                    >
                      <ArrowLeft className="h-2.5 w-2.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === value.length - 1}
                      onClick={() => moveShift(index, 'right')}
                      className="h-4 w-4 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 flex items-center justify-center"
                      title="Geser ke kanan"
                    >
                      <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeShift(index)}
                      className="h-4 w-4 rounded hover:bg-red-500 hover:text-white flex items-center justify-center text-current/70"
                      title="Hapus dari urutan"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cycle summary footer */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Panjang siklus: <strong>{value.length} hari</strong> ({workDaysCount} hari dinas, {offDaysCount} hari libur)
              </span>
              <span className="text-[10px] text-slate-400">
                Pola berputar otomatis tak terbatas (modulo kalender)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
