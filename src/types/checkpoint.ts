export interface Checkpoint {
  id: string;
  siteId: string;
  code: string;
  name: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  useCheckpointGeofence?: boolean;
  active: boolean;
  createdAt?: string;
  site?: {
    id: string;
    name: string;
  };
}

export interface CreateCheckpointPayload {
  siteId: string;
  code: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  useCheckpointGeofence?: boolean;
}

export interface UpdateCheckpointPayload {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  useCheckpointGeofence?: boolean;
  active?: boolean;
}

export interface RotateQrResponse {
  qrPayload: string;
}
