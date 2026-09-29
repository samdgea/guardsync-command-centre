import { ApiResponse } from './envelope';

export type PhotoCategory = 'profile' | 'patrol' | 'log_entry' | 'incident' | 'general';

export interface PresignedUrlData {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  method: 'PUT';
  headers: {
    'Content-Type': string;
    Host?: string[];
  };
  expiresAt: string;
  expiresInSeconds: number;
}

export type UploadProgressCallback = (percentage: number) => void;

export interface UploadPresignedPayload {
  category: PhotoCategory | string;
  contentType: string;
  fileName: string;
}

export interface ConfirmPhotoPayload {
  photoKey: string;
}

export interface ConfirmPhotoResponse {
  profilePhotoUrl: string;
}

export type { ApiResponse };
