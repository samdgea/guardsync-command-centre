export type LogBookStatus = 'ACTIVE' | 'CLOSED' | 'ACCEPTED';

export type LogBookEntryCategory =
  | 'BARANG_MASUK'
  | 'BARANG_KELUAR'
  | 'MONITORING'
  | 'KERUSAKAN'
  | 'POTENSI_BAHAYA'
  | 'INSIDEN'
  | 'LAINNYA';

export interface LogBookItemCheck {
  id: string;
  inventoryItemId: string;
  name: string;
  condition: 'BAIK' | 'RUSAK';
  notes?: string | null;
}

export interface LogBookEntryPhoto {
  id: string;
  path: string;
}

export interface LogBookEntry {
  id: string;
  logBookId: string;
  category: LogBookEntryCategory;
  description: string;
  occurredAt: string;
  photos?: LogBookEntryPhoto[];
}

export interface LogBook {
  id: string;
  siteId: string;
  shift: string;
  status: LogBookStatus;
  openedAt: string;
  closedAt?: string | null;
  creator: {
    id: string;
    name: string;
  };
  receiver?: {
    id: string;
    name: string;
  } | null;
  items?: LogBookItemCheck[];
}
