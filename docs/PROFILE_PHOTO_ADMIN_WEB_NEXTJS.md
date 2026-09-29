# Profile Photo Upload Flow - Admin Web Next.js

Dokumentasi terpisah untuk **SUPER_ADMIN** dan **ADMIN** di Command Centre Web.

---

## Ringkasan Perizinan

| Aksi | SUPER_ADMIN | ADMIN |
|------|-------------|-------|
| Upload/hapus foto sendiri | ✅ | ✅ |
| Upload/hapus foto OFFICER | ✅ | ✅ |
| Upload/hapus foto SUPERVISOR | ✅ | ✅ |
| Upload/hapus foto ADMIN lain | ✅ | ❌ |
| Upload/hapus foto SUPER_ADMIN | ✅ | ❌ |

---

## Logic Perizinan di Backend

Kode di [`UserController@uploadUserPhoto`](app/Http/Controllers/Api/UserController.php):

```php
$actorRole = $actor->role->value;
$targetRole = $targetUser->role->value;

if ($actorRole !== Role::SUPER_ADMIN->value && $targetRole === Role::SUPER_ADMIN->value) {
    throw new AppException(403, 'Forbidden');
}
```

**Catatan:** Backend saat ini hanya memblokir ADMIN → SUPER_ADMIN. Untuk konsistensi, di **frontend** tambahkan juga pengecekan: ADMIN tidak boleh mengedit ADMIN lain.

---

## Helper Function Cek Izin (Frontend)

```typescript
// lib/types.ts

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'OFFICER';

export interface User {
  id: string;
  employeeId: string;
  email?: string;
  name: string;
  role: UserRole;
  active: boolean;
  profilePhotoUrl?: string | null;
}

export function canEditUserPhoto(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'SUPER_ADMIN') return true;
  
  if (actorRole === 'ADMIN') {
    if (targetRole === 'SUPER_ADMIN') return false;
    if (targetRole === 'ADMIN') return false;
    return true;
  }
  
  return false;
}
```

---

## API Helpers

```typescript
// lib/api.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export async function uploadProfilePhoto(
  token: string,
  targetUserId: string | 'me',
  file: File
): Promise<ApiResponse<{ profilePhotoUrl: string }>> {
  const formData = new FormData();
  formData.append('photo', file);

  const endpoint = targetUserId === 'me' 
    ? '/auth/me/photo' 
    : `/users/${targetUserId}/photo`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  return response.json();
}

export async function deleteProfilePhoto(
  token: string,
  targetUserId: string | 'me'
): Promise<ApiResponse> {
  const endpoint = targetUserId === 'me' 
    ? '/auth/me/photo' 
    : `/users/${targetUserId}/photo`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
}
```

---

## Contoh Komponen PhotoUploader

```tsx
// app/components/PhotoUploader.tsx
'use client';

import { useState, useRef } from 'react';
import { uploadProfilePhoto, deleteProfilePhoto } from '@/lib/api';
import { User, UserRole, canEditUserPhoto } from '@/lib/types';

interface PhotoUploaderProps {
  user: User;
  currentUserRole: UserRole;
  token: string;
  isOwnProfile: boolean;
  onPhotoUpdated: (newUrl: string | null) => void;
}

export default function PhotoUploader({
  user,
  currentUserRole,
  token,
  isOwnProfile,
  onPhotoUpdated,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPermission = isOwnProfile || canEditUserPhoto(currentUserRole, user.role);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal 2MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const targetId = isOwnProfile ? 'me' : user.id;
      const response = await uploadProfilePhoto(token, targetId, file);

      if (response.success && response.data) {
        onPhotoUpdated(response.data.profilePhotoUrl);
      } else {
        setError(response.message || 'Gagal mengunggah foto.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus foto profil?')) return;

    setIsUploading(true);
    setError(null);

    try {
      const targetId = isOwnProfile ? 'me' : user.id;
      const response = await deleteProfilePhoto(token, targetId);

      if (response.success) {
        onPhotoUpdated(null);
      } else {
        setError(response.message || 'Gagal menghapus foto.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setIsUploading(false);
    }
  };

  // Tidak punya izin: tampilkan readonly avatar
  if (!hasPermission) {
    return (
      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
        {user.profilePhotoUrl ? (
          <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl text-gray-500 font-medium">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-3">
      <div 
        className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden 
                   relative group cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {user.profilePhotoUrl ? (
          <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl text-gray-500 font-medium">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 
                        transition-opacity flex items-center justify-center text-white text-sm">
          {isUploading ? '...' : 'Ganti'}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex space-x-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Upload
        </button>
        {user.profilePhotoUrl && (
          <button
            onClick={handleDelete}
            disabled={isUploading}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded 
                       hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hapus
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-xs text-gray-500">Max 2MB • JPG, PNG, WebP</p>
    </div>
  );
}
```

---

## Response API

### Success Upload (200)
```json
{
  "success": true,
  "message": "Foto profil berhasil diunggah",
  "data": { "profilePhotoUrl": "https://s3..../photo.jpg" }
}
```

### Success Delete (200)
```json
{
  "success": true,
  "message": "Foto profil berhasil dihapus"
}
```

### Forbidden (403) - ADMIN mencoba ubah SUPER_ADMIN
```json
{
  "success": false,
  "message": "Akses ditolak"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validasi gagal",
  "data": { "photo": ["The photo must not be greater than 2048 kilobytes."] }
}
```

---

## Checklist

- [ ] Buat type `User` + helper `canEditUserPhoto()`
- [ ] Buat `uploadProfilePhoto()` dan `deleteProfilePhoto()` API helpers
- [ ] Buat komponen `PhotoUploader` dengan readonly fallback jika tidak punya izin
- [ ] Di halaman User Detail: sembunyikan tombol jika `canEditUserPhoto()` = false
- [ ] Handle response error 403 khusus untuk message "Anda tidak memiliki izin"
