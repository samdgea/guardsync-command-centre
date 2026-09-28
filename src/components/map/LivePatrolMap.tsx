'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ActivePatrolSession } from '@/types/patrol';
import { formatDate } from '@/lib/utils';

interface LivePatrolMapProps {
  sessions: ActivePatrolSession[];
}

export function LivePatrolMap({ sessions }: LivePatrolMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let L: any;

    async function initMap() {
      L = (await import('leaflet')).default;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current).setView([-6.2088, 106.8456], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;

        setTimeout(() => {
          map.invalidateSize();
        }, 150);

        if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
          const ro = new ResizeObserver(() => {
            map.invalidateSize();
          });
          ro.observe(mapContainerRef.current);
        }
      }

      // Update markers
      if (markersLayerRef.current && mapInstanceRef.current) {
        markersLayerRef.current.clearLayers();

        const bounds = L.latLngBounds([]);
        let hasValidCoords = false;

        sessions.forEach((s) => {
          if (s.latitude && s.longitude) {
            hasValidCoords = true;
            const latLng = [s.latitude, s.longitude];
            bounds.extend(latLng);

            // Custom pulse green marker for active patrol
            const markerHtml = `
              <div style="position: relative; width: 24px; height: 24px;">
                <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: #22c55e; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background-color: #16a34a; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
              </div>
            `;

            const customIcon = L.divIcon({
              html: markerHtml,
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            const marker = L.marker(latLng, { icon: customIcon });

            const popupContent = `
              <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 4px;">
                <strong style="color: #0f172a; font-size: 13px;">${s.name}</strong><br/>
                <span style="color: #64748b;">Kode: ${s.code}</span><br/>
                <span style="color: #16a34a; font-weight: 600;">● Sesi Aktif</span><br/>
                <span style="color: #64748b;">Mulai: ${formatDate(s.startedAt)}</span>
              </div>
            `;

            marker.bindPopup(popupContent);
            markersLayerRef.current.addLayer(marker);
          }
        });

        if (hasValidCoords) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      }
    }

    initMap();

    return () => {
      // Do not destroy map on session updates to prevent flickering
    };
  }, [isClient, sessions]);

  if (!isClient) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-500">
        Memuat Peta Pemantauan...
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
      className="w-full h-full min-h-[400px] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative z-0"
    />
  );
}
