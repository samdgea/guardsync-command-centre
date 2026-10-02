'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '@/features/sites/api';
import { useAuthStore } from '@/stores/authStore';
import { Site, CreateSitePayload, UpdateSitePayload } from '@/types/site';
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
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPicker } from '@/components/map/MapPicker';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Users,
  Search,
  ExternalLink,
  Calendar,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SitesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateSitePayload>({
    code: '',
    name: '',
    address: '',
    latitude: -6.21462,
    longitude: 106.81845,
    radiusMeters: 150,
    enforceGeofence: true,
    pic: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sites-list', page],
    queryFn: () => sitesApi.getSites({ page, limit: 10 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSitePayload) => sitesApi.createSite(payload),
    onSuccess: () => {
      toast.success('Situs baru berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['sites-list'] });
      queryClient.invalidateQueries({ queryKey: ['sites', 'switcher'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal membuat situs');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSitePayload }) =>
      sitesApi.updateSite(id, payload),
    onSuccess: () => {
      toast.success('Data situs berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['sites-list'] });
      queryClient.invalidateQueries({ queryKey: ['sites', 'switcher'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui situs');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sitesApi.deleteSite(id),
    onSuccess: () => {
      toast.success('Situs berhasil dinonaktifkan');
      queryClient.invalidateQueries({ queryKey: ['sites-list'] });
      queryClient.invalidateQueries({ queryKey: ['sites', 'switcher'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menonaktifkan situs');
    },
  });

  const handleOpenCreate = () => {
    setEditingSite(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      latitude: -6.21462,
      longitude: 106.81845,
      radiusMeters: 150,
      enforceGeofence: true,
      pic: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (site: Site) => {
    setEditingSite(site);
    setFormData({
      code: site.code,
      name: site.name,
      address: site.address || '',
      latitude: site.latitude || -6.21462,
      longitude: site.longitude || 106.81845,
      radiusMeters: site.radiusMeters || 150,
      enforceGeofence: site.enforceGeofence ?? true,
      pic: site.pic || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menonaktifkan situs ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSite) {
      updateMutation.mutate({
        id: editingSite.id,
        payload: {
          name: formData.name,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          radiusMeters: formData.radiusMeters,
          enforceGeofence: formData.enforceGeofence,
          pic: formData.pic,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const sites = data?.data || [];
  const filteredSites = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.address && s.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Manajemen Situs / Lokasi
          </h1>
          <p className="text-sm text-slate-500">
            Daftar gedung, pabrik, atau cabang operasional beserta radius geofence.
          </p>
        </div>

        {/* RBAC Guard: Hanya SUPER_ADMIN yang bisa buat site baru */}
        {isSuperAdmin && (
          <Button onClick={handleOpenCreate} className="text-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Situs Baru
          </Button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kode atau nama situs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Sites Table */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            Tidak ada situs ditemukan.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Situs</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Geofence</TableHead>
                <TableHead>PIC / Penanggung Jawab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-mono font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {site.code}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    <Link
                      href={`/sites/${site.id}`}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      {site.name}
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                    {site.address || '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-mono">{site.radiusMeters || 100}m</span>
                    {site.enforceGeofence ? (
                      <span className="ml-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        (Ketat)
                      </span>
                    ) : (
                      <span className="ml-1.5 text-[10px] text-slate-400">(Bebas)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {site.pic || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={site.active ? 'aman' : 'secondary'} className="text-[10px]">
                      {site.active ? 'AKTIF' : 'NONAKTIF'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Link href={`/sites/${site.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Kelola Petugas">
                        <Users className="h-4 w-4 text-slate-600" />
                      </Button>
                    </Link>
                    <Link href={`/sites/${site.id}/roster-teams`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Kelola Tim Roster">
                        <Layers className="h-4 w-4 text-blue-600" />
                      </Button>
                    </Link>
                    <Link href={`/sites/${site.id}/schedule-matrix`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Matriks Kalender Jadwal">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(site)}
                      title="Edit Situs"
                    >
                      <Edit className="h-4 w-4 text-slate-600" />
                    </Button>
                    {/* RBAC Guard: Hanya SUPER_ADMIN yang bisa hapus/nonaktifkan site */}
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(site.id)}
                        title="Nonaktifkan Situs"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Pagination meta={data?.pagination} onPageChange={setPage} isLoading={isLoading} />
      </div>

      {/* Modal Create / Edit Site */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSite ? 'Edit Detail Situs' : 'Tambah Situs Operasional Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Kode Situs</label>
                <Input
                  required
                  placeholder="Contoh: SITE-HQ"
                  value={formData.code}
                  disabled={!!editingSite} // Code immutable on edit
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Nama Situs / Gedung</label>
                <Input
                  required
                  placeholder="Contoh: Head Office Sudirman"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Alamat Lengkap</label>
              <Input
                placeholder="Jl. Jendral Sudirman Kav. 21, Jakarta Selatan"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">PIC / Kontak Penanggung Jawab</label>
                <Input
                  placeholder="Contoh: Bpk. Bambang (08123456789)"
                  value={formData.pic || ''}
                  onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Radius Geofence (Meter)</label>
                <Input
                  type="number"
                  min={10}
                  max={5000}
                  value={formData.radiusMeters || 150}
                  onChange={(e) =>
                    setFormData({ ...formData, radiusMeters: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="enforceGeofence"
                checked={formData.enforceGeofence}
                onChange={(e) =>
                  setFormData({ ...formData, enforceGeofence: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
              />
              <label htmlFor="enforceGeofence" className="text-xs text-slate-700 dark:text-slate-300">
                Wajibkan Geofence (Satpam di luar radius tidak bisa scan QR patroli)
              </label>
            </div>

            {/* Map Picker for Coordinates */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Pilih Titik Pusat GPS & Visualisasi Radius Geofence
              </label>
              <MapPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                radiusMeters={formData.radiusMeters}
                onChange={(coords) =>
                  setFormData((prev) => ({
                    ...prev,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                  }))
                }
              />
              <div className="flex gap-4 text-xs font-mono text-slate-500 pt-1">
                <span>Lat: {formData.latitude}</span>
                <span>Lng: {formData.longitude}</span>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingSite ? 'Simpan Perubahan' : 'Buat Situs'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
