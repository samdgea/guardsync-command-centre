'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { sitesApi } from '@/features/sites/api';
import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronDown, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SiteSwitcher() {
  const user = useAuthStore((s) => s.user);
  const { selectedSiteId, setSelectedSiteId, sitesList, setSitesList } = useSiteContextStore();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Fetch sites if super admin or admin
  const { data: sitesData } = useQuery({
    queryKey: ['sites', 'switcher'],
    queryFn: () => sitesApi.getSites({ limit: 100 }),
    enabled: !!user,
  });

  useEffect(() => {
    if (sitesData?.data) {
      setSitesList(sitesData.data);
    }
  }, [sitesData, setSitesList]);

  // Determine site options
  // For SUPER_ADMIN: all sites from API
  // For ADMIN: strictly the sites assigned to them in user.assignments
  const assignedSites = React.useMemo(() => {
    if (isSuperAdmin) {
      return sitesList;
    }
    const assignments = user?.assignments || [];
    // Map assignments to sites if available
    return assignments.map((a) => {
      const matched = sitesList.find((s) => s.id === a.siteId || s.id === a.id);
      if (matched) return matched;
      return {
        id: a.siteId || a.id,
        name: a.name || a.site?.name || 'Situs Penugasan',
        code: a.code || a.site?.code || 'SITE',
        active: true,
      };
    });
  }, [isSuperAdmin, sitesList, user?.assignments]);

  // If user is ADMIN with exactly 1 assignment, lock context to that site
  useEffect(() => {
    if (!isSuperAdmin && assignedSites.length === 1) {
      const singleSiteId = assignedSites[0].id;
      if (selectedSiteId !== singleSiteId) {
        setSelectedSiteId(singleSiteId);
      }
    }
  }, [isSuperAdmin, assignedSites, selectedSiteId, setSelectedSiteId]);

  if (!user) return null;

  // Single site locked badge for ADMIN
  if (!isSuperAdmin && assignedSites.length === 1) {
    const site = assignedSites[0];
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-xs">
        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="text-slate-500 dark:text-slate-400">Situs:</span>
        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
          {site.name}
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
          Terkunci
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <Building2 className="absolute left-3 h-4 w-4 text-slate-500 pointer-events-none" />
        <select
          value={selectedSiteId || ''}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedSiteId(val === '' ? null : val);
          }}
          className="h-9 pl-9 pr-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 cursor-pointer appearance-none"
        >
          {isSuperAdmin && (
            <option value="">Semua Site (Global View)</option>
          )}
          {assignedSites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name} ({site.code})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
