export interface InventoryItem {
  id: string;
  siteId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateInventoryPayload {
  siteId: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateInventoryPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}
