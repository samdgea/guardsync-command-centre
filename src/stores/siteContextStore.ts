import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Site } from '@/types/site';

interface SiteContextState {
  selectedSiteId: string | null; // null = "Semua Site (Global View)" for SUPER_ADMIN
  sitesList: Site[];
  setSelectedSiteId: (siteId: string | null) => void;
  setSitesList: (sites: Site[]) => void;
  resetSiteContext: () => void;
}

export const useSiteContextStore = create<SiteContextState>()(
  persist(
    (set) => ({
      selectedSiteId: null,
      sitesList: [],

      setSelectedSiteId: (siteId: string | null) => {
        set({ selectedSiteId: siteId });
      },

      setSitesList: (sites: Site[]) => {
        set({ sitesList: sites });
      },

      resetSiteContext: () => {
        set({ selectedSiteId: null, sitesList: [] });
      },
    }),
    {
      name: 'guardsync_site_context',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedSiteId: state.selectedSiteId,
      }),
    }
  )
);
