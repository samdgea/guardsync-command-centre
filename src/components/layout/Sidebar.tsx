'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MapPin,
  Building,
  Clock,
  QrCode,
  Package,
  Users,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  BookOpen,
  UserCircle,
  Shield,
  CalendarClock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  superAdminOnly?: boolean;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationItems: NavGroup[] = [
  {
    title: 'Command Centre',
    items: [
      { name: 'Live Overview', href: '/dashboard', icon: LayoutDashboard, exact: true },
      { name: 'Peta Realtime', href: '/monitoring/map', icon: MapPin },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { name: 'Situs / Site', href: '/sites', icon: Building, superAdminOnly: true },
      { name: 'Master Shift', href: '/shifts', icon: Clock, superAdminOnly: true },
      { name: 'Manajemen Roster & Jadwal', href: '/roster', icon: CalendarClock, adminOnly: true },
      { name: 'Checkpoint & QR', href: '/checkpoints', icon: QrCode },
      { name: 'Inventaris Pos', href: '/inventory', icon: Package },
      { name: 'Pengguna & Petugas', href: '/users', icon: Users },
    ],
  },
  {
    title: 'Laporan & Audit',
    items: [
      { name: 'Review Kunjungan', href: '/reports/visits', icon: AlertTriangle },
      { name: 'Ringkasan & Tren', href: '/reports', icon: BarChart3, exact: true },
      { name: 'Kepatuhan Jadwal', href: '/reports/compliance', icon: CheckCircle2 },
      { name: 'Buku Mutasi', href: '/logbooks', icon: BookOpen },
    ],
  },
  {
    title: 'Pengaturan',
    items: [
      { name: 'Profil & Keamanan', href: '/profile', icon: UserCircle },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 min-h-screen">
      {/* Brand logo & title */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="h-9 w-9 rounded-lg bg-slate-900 dark:bg-slate-50 text-slate-50 dark:text-slate-900 flex items-center justify-center font-bold">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-50">
            GuardSync
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Command Centre
          </span>
        </div>
      </div>

      {/* Nav list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navigationItems.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.superAdminOnly && !isSuperAdmin) return false;
            if (item.adminOnly && !isAdmin) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              <h4 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.title}
              </h4>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User brief footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200">
          {user?.name ? user.name.slice(0, 2).toUpperCase() : 'GS'}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100">
            {user?.name || 'Administrator'}
          </span>
          <span className="text-[10px] text-slate-500 truncate">
            {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin Lapangan'}
          </span>
        </div>
      </div>
    </aside>
  );
}
