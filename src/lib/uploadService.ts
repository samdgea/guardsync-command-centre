import { ApiResponse, PresignedUrlData, UploadProgressCallback } from '@/types/upload';
import { api } from '@/lib/api-client';
import { unwrap } from '@/lib/envelope';
import { useAuthStore } from '@/stores/authStore';

function resolveToken(token?: string | null): string {
  if (token) return token;
  const storeToken = useAuthStore.getState().accessToken;
  if (storeToken) return storeToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('guardsync_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.accessToken) {
          return parsed.state.accessToken;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return '';
}

/**
 * 1. Minta Pre-signed URL ke Backend
 */
export async function getPresignedUploadUrl(
  token: string | null | undefined,
  category: string,
  file: File
): Promise<PresignedUrlData>;
export async function getPresignedUploadUrl(
  category: string,
  file: File
): Promise<PresignedUrlData>;
export async function getPresignedUploadUrl(
  tokenOrCategory?: string | null,
  categoryOrFile?: string | File,
  fileArg?: File
): Promise<PresignedUrlData> {
  let token: string | undefined;
  let category: string;
  let file: File;

  if (categoryOrFile instanceof File) {
    token = undefined;
    category = tokenOrCategory || 'profile';
    file = categoryOrFile;
  } else {
    token = tokenOrCategory || undefined;
    category = categoryOrFile || 'profile';
    file = fileArg as File;
  }

  const authToken = resolveToken(token);
  const config = authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined;

  const res = await api.post<ApiResponse<PresignedUrlData>>(
    '/uploads/presigned-url',
    {
      category,
      contentType: file.type,
      fileName: file.name,
    },
    config
  );

  return unwrap<PresignedUrlData>(res).data;
}

/**
 * 2. Upload file ke AWS S3 via HTTP PUT (dengan pelacak progress)
 * Menggunakan server-side proxy internal Next.js (/api/upload/s3-proxy) untuk mencegah error CORS S3 di browser.
 */
export function uploadToS3WithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: UploadProgressCallback,
  useProxy = true
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Gunakan server-side proxy untuk mengatasi penolakan CORS browser saat HTTP PUT ke AWS S3
    const targetUrl = useProxy
      ? `/api/upload/s3-proxy?url=${encodeURIComponent(uploadUrl)}`
      : uploadUrl;

    xhr.open('PUT', targetUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);
    if (useProxy) {
      xhr.setRequestHeader('x-s3-upload-url', uploadUrl);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.message || `Gagal mengunggah ke storage (Status: ${xhr.status})`));
        } catch {
          reject(new Error(`Gagal mengunggah ke storage (Status: ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Koneksi terputus saat mengunggah foto ke storage'));
    xhr.ontimeout = () => reject(new Error('Waktu unggah ke storage habis (timeout)'));

    xhr.send(file);
  });
}

/**
 * 3. Simpan S3 photoKey ke data user
 */
export async function confirmProfilePhotoKey(
  token: string | null | undefined,
  targetUserId: string | 'me',
  photoKey: string
): Promise<{ profilePhotoUrl: string }>;
export async function confirmProfilePhotoKey(
  targetUserId: string | 'me',
  photoKey: string
): Promise<{ profilePhotoUrl: string }>;
export async function confirmProfilePhotoKey(
  tokenOrUserId: string | 'me' | null | undefined,
  targetUserIdOrKey: string | 'me',
  photoKeyArg?: string
): Promise<{ profilePhotoUrl: string }> {
  let token: string | undefined;
  let targetUserId: string | 'me';
  let photoKey: string;

  if (photoKeyArg === undefined) {
    token = undefined;
    targetUserId = tokenOrUserId as (string | 'me');
    photoKey = targetUserIdOrKey;
  } else {
    token = tokenOrUserId || undefined;
    targetUserId = targetUserIdOrKey as (string | 'me');
    photoKey = photoKeyArg;
  }

  const authToken = resolveToken(token);
  const endpoint =
    targetUserId === 'me'
      ? '/auth/me/photo'
      : `/users/${targetUserId}/photo`;

  const config = authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined;

  const res = await api.post<ApiResponse<{ profilePhotoUrl: string }>>(
    endpoint,
    { photoKey },
    config
  );

  return unwrap<{ profilePhotoUrl: string }>(res).data;
}

/**
 * Fungsi Komposit: Eksekusi Step 1 -> Step 2 -> Step 3 secara seamless
 */
export async function uploadProfilePhotoDirect(
  token: string | null | undefined,
  targetUserId: string | 'me',
  file: File,
  onProgress?: UploadProgressCallback,
  useProxy?: boolean
): Promise<string>;
export async function uploadProfilePhotoDirect(
  targetUserId: string | 'me',
  file: File,
  onProgress?: UploadProgressCallback,
  useProxy?: boolean
): Promise<string>;
export async function uploadProfilePhotoDirect(
  tokenOrUserId: string | 'me' | null | undefined,
  targetUserIdOrFile: string | 'me' | File,
  fileOrProgress?: File | UploadProgressCallback,
  onProgressOrProxy?: UploadProgressCallback | boolean,
  useProxyArg = true
): Promise<string> {
  let token: string | undefined;
  let targetUserId: string | 'me';
  let file: File;
  let progressCb: UploadProgressCallback | undefined;
  let useProxy = true;

  if (targetUserIdOrFile instanceof File) {
    token = undefined;
    targetUserId = tokenOrUserId as (string | 'me');
    file = targetUserIdOrFile;
    progressCb = typeof fileOrProgress === 'function' ? fileOrProgress : undefined;
    useProxy = typeof onProgressOrProxy === 'boolean' ? onProgressOrProxy : true;
  } else {
    token = tokenOrUserId || undefined;
    targetUserId = targetUserIdOrFile as (string | 'me');
    file = fileOrProgress as File;
    progressCb = typeof onProgressOrProxy === 'function' ? onProgressOrProxy : undefined;
    useProxy = typeof useProxyArg === 'boolean' ? useProxyArg : true;
  }

  if (!file) {
    throw new Error('File foto profil tidak ditemukan');
  }

  // Validasi ukuran di klien (Max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Ukuran foto profil maksimal 2MB');
  }

  // Validasi format
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Format file harus berupa JPG, PNG, atau WEBP');
  }

  // Step 1: Dapatkan URL presigned
  const presigned = await getPresignedUploadUrl(token, 'profile', file);

  // Step 2: Upload langsung ke AWS S3 via proxy server-side
  await uploadToS3WithProgress(presigned.uploadUrl, file, progressCb, useProxy);

  // Step 3: Simpan photoKey ke user
  const result = await confirmProfilePhotoKey(token, targetUserId, presigned.key);

  return result.profilePhotoUrl;
}
