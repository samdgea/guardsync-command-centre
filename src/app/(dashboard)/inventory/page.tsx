'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/features/inventory/api';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { InventoryItem, CreateInventoryPayload, UpdateInventoryPayload } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Plus, Edit, Trash2, Building } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const selectedSiteId = useSiteContextStore((s) => s.selectedSiteId);
  const sitesList = useSiteContextStore((s) => s.sitesList);

  const [activeSiteId, setActiveSiteId] = useState<string>(selectedSiteId || sitesList[0]?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  React.useEffect(() => {
    if (selectedSiteId) {
      setActiveSiteId(selectedSiteId);
    } else if (sitesList.length > 0 && !activeSiteId) {
      setActiveSiteId(sitesList[0].id);
    }
  }, [selectedSiteId, sitesList]);

  const [formData, setFormData] = useState<CreateInventoryPayload>({
    siteId: activeSiteId,
    name: '',
    description: '',
    isActive: true,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-list', activeSiteId],
    queryFn: () => inventoryApi.getInventory(activeSiteId),
    enabled: !!activeSiteId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateInventoryPayload) => inventoryApi.createInventory(payload),
    onSuccess: () => {
      toast.success('Item inventaris berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['inventory-list', activeSiteId] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menambah item');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInventoryPayload }) =>
      inventoryApi.updateInventory(id, payload),
    onSuccess: () => {
      toast.success('Item inventaris berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['inventory-list', activeSiteId] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui item');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteInventory(id),
    onSuccess: () => {
      toast.success('Item inventaris berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['inventory-list', activeSiteId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus item');
    },
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      siteId: activeSiteId,
      name: '',
      description: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      siteId: item.siteId,
      name: item.name,
      description: item.description || '',
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus item inventaris ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        payload: {
          name: formData.name,
          description: formData.description,
          isActive: formData.isActive,
        },
      });
    } else {
      createMutation.mutate({
        ...formData,
        siteId: activeSiteId,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Package className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Manajemen Inventaris Pos Satpam
          </h1>
          <p className="text-sm text-slate-500">
            Daftar perlengkapan pos (HT, Senter, Rompi, Kunci) yang diperiksa saat serah terima shift mutasi.
          </p>
        </div>

        <Button onClick={handleOpenAdd} disabled={!activeSiteId} className="text-xs">
          <Plus className="h-4 w-4 mr-1.5" />
          Tambah Item Alat
        </Button>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Building className="h-4 w-4 text-slate-500" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Pilih Situs:
        </span>
        <select
          value={activeSiteId}
          onChange={(e) => setActiveSiteId(e.target.value)}
          className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium focus:ring-2 focus:ring-slate-900"
        >
          {sitesList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !activeSiteId ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-lg border">
            Silakan pilih situs untuk memuat inventaris pos.
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            Belum ada inventaris yang didaftarkan pada situs ini.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Barang / Alat</TableHead>
                <TableHead>Deskripsi & Keterangan</TableHead>
                <TableHead>Status Operasional</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {item.name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? 'aman' : 'secondary'} className="text-[10px]">
                      {item.isActive ? 'AKTIF DIGUNAKAN' : 'NONAKTIF / DISIMPAN'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-600"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Item"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(item.id)}
                      title="Hapus Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item Inventaris' : 'Tambah Perlengkapan Pos'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Nama Barang / Alat</label>
              <Input
                required
                placeholder="Contoh: Handy Talky Motorola #1 (Channel 1)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Deskripsi & Kondisi Awal</label>
              <Input
                placeholder="Contoh: Dilengkapi charger pos, stiker kode inventaris #04"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
              />
              <label htmlFor="isActive" className="text-xs text-slate-700 dark:text-slate-300">
                Item aktif (wajib diperiksa saat serah terima shift mutasi)
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Simpan' : 'Tambahkan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
