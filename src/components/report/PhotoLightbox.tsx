'use client';

import React, { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { PatrolPhoto } from '@/types/report';
import { getPhotoUrl } from '@/lib/utils';

interface PhotoLightboxProps {
  photos: (PatrolPhoto | { id?: string; path?: string; url?: string; originalName?: string })[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoLightbox({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [currentIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, photos.length]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  const photoUrl = getPhotoUrl(currentPhoto);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 focus:outline-none pointer-events-auto select-none"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            Penampil Foto Lampiran
          </DialogPrimitive.Title>

          {/* Close button */}
          <DialogPrimitive.Close
            type="button"
            aria-label="Tutup penampil foto"
            className="absolute top-4 right-4 z-[110] rounded-full bg-slate-800/80 p-2.5 text-white hover:bg-slate-700 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X className="h-6 w-6" />
          </DialogPrimitive.Close>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Foto sebelumnya"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-[110] rounded-full bg-slate-800/80 p-3 text-white hover:bg-slate-700 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Foto selanjutnya"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] rounded-full bg-slate-800/80 p-3 text-white hover:bg-slate-700 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Photo frame */}
          <div className="flex flex-col items-center max-w-4xl max-h-[85vh] w-full">
            <div className="relative min-h-[200px] w-full flex items-center justify-center">
              {isLoading && !hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-xs">Memuat foto...</span>
                </div>
              )}

              {hasError ? (
                <div className="p-8 rounded-lg bg-slate-900 border border-slate-800 text-center max-w-md space-y-3">
                  <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Gagal Memuat Foto</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      File gambar tidak dapat dimuat dari server penyimpanan backend.
                    </p>
                  </div>
                  {photoUrl && (
                    <a
                      href={photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka Tautan File Langsung
                    </a>
                  )}
                </div>
              ) : (
                <img
                  src={photoUrl}
                  alt={currentPhoto?.originalName || 'Bukti Temuan Patroli'}
                  referrerPolicy="no-referrer"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                  }}
                  className={`max-h-[75vh] max-w-full object-contain rounded-md shadow-2xl transition-opacity duration-200 ${
                    isLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              )}
            </div>

            <div className="mt-3 text-center text-xs text-slate-300">
              Foto {currentIndex + 1} dari {photos.length}
              {currentPhoto?.originalName && ` — ${currentPhoto.originalName}`}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
