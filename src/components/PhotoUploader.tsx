'use client';

import { useState, useRef, useEffect } from 'react';
import { User, canEditUserPhoto } from '@/types/user';
import { UserRole } from '@/types/auth';
import { usersApi } from '@/features/users/api';
import { resolveImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { Camera, Check, Loader2, RotateCw, Trash2, X } from 'lucide-react';

interface PhotoUploaderProps {
  user: User;
  currentUserRole: UserRole;
  isOwnProfile?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onPhotoUpdated: (newUrl: string | null) => void;
}

const SIZES = {
  sm: {
    container: 'w-16 h-16',
    text: 'text-lg',
    icon: 'h-4 w-4',
  },
  md: {
    container: 'w-24 h-24', // 96px
    text: 'text-2xl',
    icon: 'h-5 w-5',
  },
  lg: {
    container: 'w-36 h-36', // 144px
    text: 'text-4xl',
    icon: 'h-7 w-7',
  },
  xl: {
    container: 'w-48 h-48', // 192px
    text: 'text-5xl',
    icon: 'h-8 w-8',
  },
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Normalizes image orientation using the browser's native decoder.
 * Modern browsers automatically apply EXIF orientation when decoding to an ImageBitmap.
 * Drawing onto canvas bakes the corrected orientation directly into the pixels
 * and strips the EXIF header, preventing orientation bugs across all devices.
 */
async function normalizeImageOrientation(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, 0.92)
    );

    if (!blob) return file;
    return new File([blob], file.name, { type: outputType });
  } catch (err) {
    console.warn('Gagal menormalkan orientasi foto:', err);
    return file;
  }
}

/**
 * Rotates an image file by a given angle (in degrees, typically 90 deg clockwise).
 */
async function rotateFile(file: File, degrees = 90): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');

  const swapDimensions = Math.abs(degrees % 180) === 90;
  canvas.width = swapDimensions ? bitmap.height : bitmap.width;
  canvas.height = swapDimensions ? bitmap.width : bitmap.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, 0.92)
  );

  if (!blob) return file;
  return new File([blob], file.name, { type: outputType });
}

export default function PhotoUploader({
  user,
  currentUserRole,
  isOwnProfile = false,
  size = 'md',
  onPhotoUpdated,
}: PhotoUploaderProps) {
  const currentSize = SIZES[size] || SIZES.md;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const hasPermission = isOwnProfile || canEditUserPhoto(currentUserRole, user.role);
  const savedPhotoUrl = user.profilePhotoUrl ? resolveImageUrl(user.profilePhotoUrl) : null;
  const activeDisplayUrl = previewUrl || savedPhotoUrl;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE) {
      return 'Ukuran file terlalu besar. Maksimal 2MB.';
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP.';
    }
    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);

    try {
      const normalizedFile = await normalizeImageOrientation(file);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(normalizedFile);
      setPreviewFile(normalizedFile);
      setPreviewUrl(newPreviewUrl);
    } catch {
      toast.error('Gagal memproses file foto yang dipilih.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotate = async () => {
    if (!previewFile || isProcessing || isUploading) return;
    setIsProcessing(true);

    try {
      const rotated = await rotateFile(previewFile, 90);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(rotated);
      setPreviewFile(rotated);
      setPreviewUrl(newPreviewUrl);
    } catch {
      toast.error('Gagal memutar foto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSavePreview = async () => {
    if (!previewFile || isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const targetId = isOwnProfile ? 'me' : user.id;
      const result = await usersApi.uploadProfilePhoto(targetId, previewFile, (percent) => {
        setUploadProgress(percent);
      });
      onPhotoUpdated(result.profilePhotoUrl);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      toast.success('Foto profil berhasil diperbarui.');
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Gagal mengunggah foto profil.';
      toast.error(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async () => {
    if (isUploading) return;
    setIsUploading(true);

    try {
      const targetId = isOwnProfile ? 'me' : user.id;
      await usersApi.deleteProfilePhoto(targetId);
      onPhotoUpdated(null);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewFile(null);
      setPreviewUrl(null);

      toast.success('Foto profil berhasil dihapus.');
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Gagal menghapus foto profil.';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const initials = user.name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (!hasPermission) {
    return (
      <div className={`${currentSize.container} rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm`}>
        {savedPhotoUrl ? (
          <img
            src={savedPhotoUrl}
            alt={user.name}
            className="w-full h-full object-cover"
            style={{ imageOrientation: 'from-image' }}
          />
        ) : (
          <span className={`${currentSize.text} text-slate-500 font-medium`}>{initials}</span>
        )}
      </div>
    );
  }

  const isBusy = isUploading || isProcessing;

  return (
    <div className="flex flex-col items-center space-y-3">
      <div
        className={`${currentSize.container} rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden relative group cursor-pointer border-2 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all hover:border-blue-400`}
        onClick={() => {
          if (!isBusy) fileInputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isBusy) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Pilih foto profil baru"
      >
        {activeDisplayUrl ? (
          <img
            src={activeDisplayUrl}
            alt={user.name}
            className="w-full h-full object-cover"
            style={{ imageOrientation: 'from-image' }}
          />
        ) : (
          <span className={`${currentSize.text} text-slate-500 font-medium`}>{initials}</span>
        )}

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
          {isBusy ? (
            <Loader2 className={`${currentSize.icon} animate-spin`} />
          ) : (
            <>
              <Camera className={currentSize.icon} />
              {(size === 'lg' || size === 'xl') && (
                <span className="text-[11px] font-medium tracking-wide">Ubah Foto</span>
              )}
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {previewFile ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSavePreview}
              disabled={isBusy}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 font-medium shadow-sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Simpan
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRotate}
              disabled={isBusy}
              className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 font-medium shadow-sm"
              title="Putar foto 90 derajat searah jarum jam"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              Putar
            </button>

            <button
              type="button"
              onClick={handleCancelPreview}
              disabled={isBusy}
              className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium"
            >
              <X className="h-3.5 w-3.5" />
              Batal
            </button>
          </div>

          {isUploading && (
            <div className="w-full max-w-[220px] space-y-1 my-1">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Mengunggah ke cloud...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full bg-blue-600 transition-all duration-150 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
            Pratinjau foto • Klik Putar jika orientasi belum pas
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 font-medium shadow-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Upload'
              )}
            </button>

            {savedPhotoUrl && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isBusy}
                className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400">Max 2MB • JPG, PNG, WebP</p>
        </div>
      )}
    </div>
  );
}
