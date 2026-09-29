# Perubahan Flow Upload Foto Profil: Direct AWS S3 Pre-signed URL
### GuardSync Command Centre (Next.js Frontend - Admin & Super Admin)

Dokumen ini menjelaskan spesifikasi dan panduan integrasi perubahan arsitektur upload foto profil di Command Centre Web (Next.js) dari metode konvensional (*multipart/form-data ke backend*) menjadi **Direct Upload ke AWS S3 via Pre-signed URL**.

---

## 1. Perbandingan Flow Lama vs Flow Baru

```
FLOW LAMA (Multipart via Backend):
[Browser Next.js] ---> (File 2MB via Multipart) ---> [Backend Laravel] ---> [AWS S3 Bucket]
Masalah: Membebani bandwidth backend, buffer memory PHP-FPM, dan bottleneck proses server.

FLOW BARU (Direct S3 Pre-signed URL):
1. [Browser Next.js] ---> POST /uploads/presigned-url ---> [Backend Laravel]
                          <--- Return { uploadUrl, key } <---
2. [Browser Next.js] -------------- HTTP PUT Raw File -------------> [AWS S3 Bucket]
                          <--------- 200 OK (S3) ----------
3. [Browser Next.js] ---> POST /users/{id}/photo { photoKey } ---> [Backend Laravel]
                          <--- 200 OK { profilePhotoUrl } <---
Keunggulan: Backend hemat resource, upload langsung ke edge AWS S3, mendukung upload progress bar akurat.
```

---

## 2. Rincian Alur 3-Langkah (3-Step Flow)

### Langkah 1: Request Pre-signed URL ke Backend
Klien mengirim permintaan pembuatan temporary URL ke GuardSync API:

- **Endpoint**: `POST /uploads/presigned-url`
- **Headers**:
  - `Authorization: Bearer <jwt_access_token>`
  - `Content-Type: application/json`
  - `Accept-Language: id` (atau `en`)
- **Request Body**:
```json
{
  "category": "profile",
  "contentType": "image/jpeg",
  "fileName": "avatar.jpg"
}
```
> **Validasi:** `contentType` harus berupa salah satu dari: `image/jpeg`, `image/jpg`, `image/png`, atau `image/webp`.

- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "URL unggah sementara berhasil dibuat",
  "data": {
    "uploadUrl": "https://guardsync-assets.s3.ap-southeast-1.amazonaws.com/profile-photos/019488a0-.../uuid.jpg?X-Amz-...",
    "key": "profile-photos/019488a0-.../uuid.jpg",
    "publicUrl": "https://guardsync-assets.syntherion.co.id/profile-photos/019488a0-.../uuid.jpg",
    "method": "PUT",
    "headers": {
      "Content-Type": "image/jpeg",
      "Host": [
        "guardsync-assets.s3.ap-southeast-1.amazonaws.com"
      ]
    },
    "expiresAt": "2026-09-29T16:45:00+07:00",
    "expiresInSeconds": 900
  }
}
```

---

### Langkah 2: Upload File Langsung ke AWS S3
Lakukan HTTP `PUT` langsung ke `uploadUrl` yang didapat dari Langkah 1.

- **Method**: `PUT`
- **URL**: `data.uploadUrl`
- **Headers**:
  - `Content-Type`: Harus persis sama dengan `contentType` saat request di Langkah 1 (contoh: `image/jpeg`).
- **Body**: File binary asli (`File` atau `Blob`).
- **Response**: `200 OK` dari S3 tanpa body response.

> [!WARNING]
> Jangan menyertakan header `Authorization: Bearer ...` saat melakukan PUT ke S3 karena signature AWS S3 sudah tersemat di URL parameter. Menyertakan header Authorization aplikasi GuardSync akan menyebabkan S3 menolak request dengan status `400 / 403`.

---

### Langkah 3: Konfirmasi & Simpan Key ke Backend
Setelah file berhasil terupload ke S3, kirimkan `key` (path S3) ke endpoint update foto profil untuk memperbarui database:

#### A. Untuk Mengubah Foto Diri Sendiri (Admin / Super Admin):
- **Endpoint**: `POST /auth/me/photo`
- **Headers**:
  - `Authorization: Bearer <jwt_access_token>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "photoKey": "profile-photos/019488a0-.../uuid.jpg"
}
```

#### B. Untuk Mengubah Foto User Lain (Officer / Supervisor):
- **Endpoint**: `POST /users/{userId}/photo`
- **Headers**:
  - `Authorization: Bearer <jwt_access_token>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "photoKey": "profile-photos/019488a0-.../uuid.jpg"
}
```

- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Foto profil berhasil diunggah",
  "data": {
    "profilePhotoUrl": "https://guardsync-assets.syntherion.co.id/profile-photos/019488a0-.../uuid.jpg"
  }
}
```

---

## 3. Matriks Otorisasi & Hak Akses (RBAC)

| Aktor | Target User | Izin Edit Foto | Respon jika Melanggar |
|---|---|---|---|
| **SUPER_ADMIN** | Diri Sendiri (`me`) | ✅ Boleh | - |
| **SUPER_ADMIN** | User Manapun (Officer, Supervisor, Admin, Super Admin lain) | ✅ Boleh | - |
| **ADMIN** | Diri Sendiri (`me`) | ✅ Boleh | - |
| **ADMIN** | Officer & Supervisor | ✅ Boleh | - |
| **ADMIN** | Admin Lain | ❌ Dilarang di Frontend | Sembunyikan tombol / disable aksi |
| **ADMIN** | Super Admin | ❌ Dilarang (Backend & Frontend) | `403 Forbidden` |

---

## 4. Implementasi Kode di Next.js (TypeScript)

### 4.1. Definisi Tipe (`types/upload.ts`)

```typescript
export type PhotoCategory = 'profile' | 'patrol' | 'log_entry' | 'incident' | 'general';

export interface PresignedUrlData {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  method: 'PUT';
  headers: {
    'Content-Type': string;
  };
  expiresAt: string;
  expiresInSeconds: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export type UploadProgressCallback = (percentage: number) => void;
```

---

### 4.2. Helper Service API (`lib/uploadService.ts`)

```typescript
import { ApiResponse, PresignedUrlData, UploadProgressCallback } from '@/types/upload';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * 1. Minta Pre-signed URL ke Backend
 */
export async function getPresignedUploadUrl(
  token: string,
  category: string,
  file: File
): Promise<PresignedUrlData> {
  const response = await fetch(`${API_BASE}/uploads/presigned-url`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'id',
    },
    body: JSON.stringify({
      category,
      contentType: file.type,
      fileName: file.name,
    }),
  });

  const resJson: ApiResponse<PresignedUrlData> = await response.json();

  if (!response.ok || !resJson.success || !resJson.data) {
    throw new Error(resJson.message || 'Gagal membuat URL unggah');
  }

  return resJson.data;
}

/**
 * 2. Upload file langsung ke AWS S3 via HTTP PUT (dengan pelacak progress)
 */
export function uploadToS3WithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);

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
        reject(new Error(`Gagal mengunggah ke cloud storage (Status: ${xhr.status})`));
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
  token: string,
  targetUserId: string | 'me',
  photoKey: string
): Promise<{ profilePhotoUrl: string }> {
  const endpoint = targetUserId === 'me'
    ? `${API_BASE}/auth/me/photo`
    : `${API_BASE}/users/${targetUserId}/photo`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'id',
    },
    body: JSON.stringify({ photoKey }),
  });

  const resJson: ApiResponse<{ profilePhotoUrl: string }> = await response.json();

  if (!response.ok || !resJson.success || !resJson.data) {
    throw new Error(resJson.message || 'Gagal memperbarui foto profil');
  }

  return resJson.data;
}

/**
 * Fungsi Komposit: Eksekusi Step 1 -> Step 2 -> Step 3 secara seamless
 */
export async function uploadProfilePhotoDirect(
  token: string,
  targetUserId: string | 'me',
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
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

  // Step 2: Upload langsung ke AWS S3
  await uploadToS3WithProgress(presigned.uploadUrl, file, onProgress);

  // Step 3: Simpan photoKey ke user
  const result = await confirmProfilePhotoKey(token, targetUserId, presigned.key);

  return result.profilePhotoUrl;
}
```

---

### 4.3. Contoh Komponen Modal Upload (`components/ProfilePhotoUploadModal.tsx`)

```tsx
'use client';

import React, { useState } from 'react';
import { uploadProfilePhotoDirect } from '@/lib/uploadService';

interface ProfilePhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string | 'me';
  token: string;
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

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
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
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengunggah foto');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Ubah Foto Profil
        </h3>

        {errorMessage && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-zinc-200 dark:border-zinc-700">
            <img
              src={previewUrl || currentPhotoUrl || '/images/default-avatar.png'}
              alt="Avatar Preview"
              className="h-full w-full object-cover"
            />
          </div>

          <label className="mt-4 cursor-pointer rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300">
            Pilih Foto Baru
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
          <span className="mt-1 text-xs text-zinc-500">Maksimal 2MB (JPG, PNG, atau WEBP)</span>
        </div>

        {isUploading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>Mengunggah langsung ke cloud...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full bg-blue-600 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? 'Menyimpan...' : 'Simpan Foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Checklist Verifikasi Frontend

1. [ ] **Validasi Tipe & Ukuran File**: Memastikan file yang dipilih tidak melebihi 2MB dan memiliki format JPG, PNG, atau WEBP sebelum memanggil API.
2. [ ] **Pre-signed Request**: Memastikan pemanggilan `POST /uploads/presigned-url` berhasil menghasilkan URL dan object key unik di folder `profile-photos/{userId}/`.
3. [ ] **Direct S3 Upload**: Memastikan browser mengirimkan HTTP `PUT` ke S3 dengan header `Content-Type: <mime>` yang sesuai dan berhasil mendapatkan respon 200 OK.
4. [ ] **No Authorization Header to S3**: Memastikan request PUT ke S3 **tidak** menyertakan header `Authorization: Bearer ...`.
5. [ ] **Konfirmasi Database**: Memastikan pemanggilan `POST /users/{id}/photo` atau `POST /auth/me/photo` dengan payload `{ photoKey }` berhasil memperbarui URL profil pengguna.
6. [ ] **Fallback & Error Handling**: Menampilkan pesan error ramah pengguna saat koneksi gagal atau terjadi penolakan izin akses (403 Forbidden).
