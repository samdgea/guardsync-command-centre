import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    // If date string doesn't have timezone offset or Z, backend might send ISO UTC string
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatTime(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Resolves an image path or URL into a fully-qualified browser-accessible URL.
 */
export function resolveImageUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '';

  const trimmed = String(pathOrUrl).trim();
  if (!trimmed) return '';

  // Already an absolute URL or data/blob URI
  if (/^(https?:|\/\/|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  // Base backend URL from environment
  const rawBase = process.env.NEXT_PUBLIC_API_URL || '';
  const baseUrl = rawBase.replace(/\/+$/, '');

  // Strip leading slash
  const cleanPath = trimmed.replace(/^\/+/, '');

  // If path already starts with 'storage/'
  if (cleanPath.startsWith('storage/')) {
    return baseUrl ? `${baseUrl}/${cleanPath}` : `/${cleanPath}`;
  }

  // If path is a common Laravel public disk directory
  if (
    cleanPath.startsWith('log-entries/') ||
    cleanPath.startsWith('patrol-photos/') ||
    cleanPath.startsWith('uploads/') ||
    cleanPath.startsWith('photos/') ||
    cleanPath.startsWith('attachments/')
  ) {
    return baseUrl ? `${baseUrl}/storage/${cleanPath}` : `/storage/${cleanPath}`;
  }

  return baseUrl ? `${baseUrl}/${cleanPath}` : `/${cleanPath}`;
}

/**
 * Extract and resolve URL from string or photo object (path, url, file_url, etc.)
 */
export function getPhotoUrl(photo: any): string {
  if (!photo) return '';
  if (typeof photo === 'string') return resolveImageUrl(photo);

  const raw =
    photo.path ||
    photo.url ||
    photo.file_url ||
    photo.photo_url ||
    photo.photoUrl ||
    photo.filePath ||
    photo.file_path ||
    photo.full_url ||
    photo.fullUrl ||
    photo.objectKey ||
    photo.object_key ||
    '';

  return resolveImageUrl(raw);
}

