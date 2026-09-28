'use client';

import React, { useState, useEffect } from 'react';
import { SiteSwitcher } from '@/components/site-switcher/SiteSwitcher';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/features/auth/api';
import { Button } from '@/components/ui/button';
import { LogOut, Moon, Sun, Shield } from 'lucide-react';
import { toast } from 'sonner';

export function Header() {
  const { user, refreshToken, clearAndRedirectToLogin } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial dark mode class
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout(refreshToken);
    } catch {
      // Ignore
    } finally {
      toast.success('Berhasil keluar dari sistem');
      clearAndRedirectToLogin();
    }
  };

  return (
    <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between">
      {/* Left: Site context switcher */}
      <div className="flex items-center gap-4">
        <SiteSwitcher />
      </div>

      {/* Right: Actions, theme toggle, logout */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleDarkMode}
          aria-label="Toggle Mode Gelap/Terang"
          className="h-9 w-9 text-slate-600 dark:text-slate-300"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-xs">
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {user?.name || user?.employeeId}
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Keluar
        </Button>
      </div>
    </header>
  );
}
