'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { sitesApi } from '@/features/sites/api';
import { cn } from '@/lib/utils';
import { Users, Calendar, ShieldAlert, ArrowLeft, Layers } from 'lucide-react';

interface SiteNavigationTabsProps {
  siteId: string;
}

export function SiteNavigationTabs({ siteId }: SiteNavigationTabsProps) {
  const pathname = usePathname();

  const { data: site } = useQuery({
    queryKey: ['site-detail', siteId],
    queryFn: () => sitesApi.getSite(siteId),
    enabled: !!siteId,
  });

  const tabs = [
    {
      name: 'Petugas Lapangan',
      href: `/sites/${siteId}`,
      icon: Users,
      exact: true,
      description: 'Daftar penugasan dan model kerja petugas',
    },
    {
      name: 'Tim Roster',
      href: `/sites/${siteId}/roster-teams`,
      icon: Layers,
      exact: false,
      description: 'Pola rotasi siklus giliran kerja tim',
    },
    {
      name: 'Matriks Jadwal',
      href: `/sites/${siteId}/schedule-matrix`,
      icon: Calendar,
      exact: false,
      description: 'Kalender grid giliran shift seluruh petugas',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Back button & Site Title */}
      <div>
        <Link
          href="/sites"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Kembali ke Daftar Situs
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {site?.code || 'SITE'}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {site?.name || 'Situs Operasional'}
              </h1>
            </div>
            {site?.address && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{site.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'group inline-flex items-center py-2.5 px-3 border-b-2 text-xs font-medium transition-colors shrink-0',
                  isActive
                    ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'mr-2 h-4 w-4',
                    isActive
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  )}
                />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
