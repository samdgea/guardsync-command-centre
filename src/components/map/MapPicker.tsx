'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MapPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
  onChange?: (coords: { latitude: number; longitude: number }) => void;
  interactive?: boolean;
}

export function MapPicker({
  latitude,
  longitude,
  radiusMeters = 100,
  onChange,
  interactive = true,
}: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const defaultLat = latitude || -6.2088; // Default Jakarta
  const defaultLng = longitude || 106.8456;

  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let L: any;
    let map: any;

    async function initMap() {
      L = (await import('leaflet')).default;

      // Fix default icon issue with webpack/Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Add Marker
        const marker = L.marker([defaultLat, defaultLng], {
          draggable: interactive,
        }).addTo(map);
        markerRef.current = marker;

        // Add Geofence Circle
        const circle = L.circle([defaultLat, defaultLng], {
          radius: radiusMeters,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
        }).addTo(map);
        circleRef.current = circle;

        if (interactive) {
          // Map click event
          map.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            circle.setLatLng([lat, lng]);
            onChange?.({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
          });

          // Marker drag event
          marker.on('dragend', (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            circle.setLatLng([lat, lng]);
            onChange?.({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
          });
        }
      }
    }

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, interactive]);

  // Update position if props change externally
  useEffect(() => {
    if (latitude && longitude && markerRef.current && circleRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setRadius(radiusMeters);
      mapInstanceRef.current.setView([latitude, longitude]);
    }
  }, [latitude, longitude, radiusMeters]);

  if (!isClient) {
    return (
      <div className="w-full h-64 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500">
        Memuat Peta...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapContainerRef}
        className="w-full h-72 rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shadow-sm"
      />
      {interactive && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Klik pada peta atau geser pin untuk menentukan koordinat latitude dan longitude.
        </p>
      )}
    </div>
  );
}
