'use client';

import React, { useState, useEffect } from 'react';
import { uploadProfilePhotoDirect } from '@/lib/uploadService';
import { resolveImageUrl } from '@/lib/utils';
import { Loader2, X } from 'lucide-react';

interface ProfilePhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string | 'me';
  token?: string;
  currentPhotoUrl?: string | null;
  onSuccess: (newPhotoUrl: string) => void;
}

export function ProfilePhotoUploadModal({
  isOpen,
  onClose,
  targetUserId,
  token,
  currentPhotoUrl,
  onSuccess,
}: ProfilePhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Ukuran foto profil maksimal 2MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Format file harus berupa JPG, PNG, atau WEBP');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClose = () => {
    if (isUploading) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setProgress(0);
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);
      setProgress(0);

      const finalUrl = await uploadProfilePhotoDirect(
        token,
        targetUserId,
        selectedFile,
        (percent) => setProgress(percent)
      );

      onSuccess(finalUrl);
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengunggah foto');
    } finally {
      setIsUploading(false);
    }
  };

  const resolvedCurrentPhoto = currentPhotoUrl ? resolveImageUrl(currentPhotoUrl) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-photo-modal-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3
            id="profile-photo-modal-title"
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            Ubah Foto Profil
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            {previewUrl || resolvedCurrentPhoto ? (
              <img
                src={previewUrl || resolvedCurrentPhoto || ''}
                alt="Avatar Preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <span className="text-2xl font-semibold">GS</span>
              </div>
            )}
          </div>

          <label className="mt-4 cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
            Pilih Foto Baru
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
          <span className="mt-1 text-xs text-slate-500">Maksimal 2MB (JPG, PNG, atau WEBP)</span>
        </div>

        {isUploading && (
          <div className="mb-4 space-y-1">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Mengunggah langsung ke cloud...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-blue-600 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isUploading ? 'Menyimpan...' : 'Simpan Foto'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePhotoUploadModal;
