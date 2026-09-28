'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkpointsApi } from '@/features/checkpoints/api';
import { useSiteContextStore } from '@/stores/siteContextStore';
import { Checkpoint, CreateCheckpointPayload, UpdateCheckpointPayload } from '@/types/checkpoint';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPicker } from '@/components/map/MapPicker';
import {
  QrCode,
  Plus,
  Edit,
  RefreshCw,
  Printer,
  MapPin,
  AlertCircle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CheckpointsPage() {
  const queryClient = useQueryClient();
  const selectedSiteId = useSiteContextStore((s) => s.selectedSiteId);
  const sitesList = useSiteContextStore((s) => s.sitesList);

  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);

  const [rotateTarget, setRotateTarget] = useState<Checkpoint | null>(null);
  const [printTarget, setPrintTarget] = useState<Checkpoint | null>(null);
  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCheckpointPayload>({
    siteId: selectedSiteId || '',
    code: '',
    name: '',
    description: '',
    latitude: -6.21461,
    longitude: 106.81844,
    useCheckpointGeofence: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['checkpoints-list', selectedSiteId, page],
    queryFn: () => checkpointsApi.getCheckpoints(selectedSiteId || undefined, { page, limit: 10 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCheckpointPayload) => checkpointsApi.createCheckpoint(payload),
    onSuccess: () => {
      toast.success('Checkpoint patroli berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['checkpoints-list'] });
      setIsAddModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal membuat checkpoint');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCheckpointPayload }) =>
      checkpointsApi.updateCheckpoint(id, payload),
    onSuccess: () => {
      toast.success('Checkpoint berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['checkpoints-list'] });
      setIsAddModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui checkpoint');
    },
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => checkpointsApi.rotateQr(id),
    onSuccess: () => {
      toast.success('QR Code checkpoint berhasil dirotasi & di-generate ulang');
      setRotateTarget(null);
      queryClient.invalidateQueries({ queryKey: ['checkpoints-list'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal merotasi QR');
    },
  });

  const downloadAllMutation = useMutation({
    mutationFn: (siteId: string) => checkpointsApi.downloadAllCheckpoints(siteId),
    onSuccess: () => {
      toast.success('File PDF QR Checkpoint berhasil diunduh');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengunduh QR Checkpoint');
    },
  });

  const handleDownloadAll = () => {
    const targetSiteId = selectedSiteId || (sitesList.length === 1 ? sitesList[0].id : null);
    if (!targetSiteId) {
      toast.error('Silakan pilih situs terlebih dahulu untuk mengunduh seluruh QR Checkpoint');
      return;
    }
    downloadAllMutation.mutate(targetSiteId);
  };

  const handleOpenAdd = () => {
    setEditingCheckpoint(null);
    const activeSite = sitesList.find((s) => s.id === (selectedSiteId || sitesList[0]?.id));
    setFormData({
      siteId: selectedSiteId || (sitesList[0]?.id ?? ''),
      code: '',
      name: '',
      description: '',
      latitude: activeSite?.latitude ?? -6.21461,
      longitude: activeSite?.longitude ?? 106.81844,
      useCheckpointGeofence: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cp: Checkpoint) => {
    setEditingCheckpoint(cp);
    setFormData({
      siteId: cp.siteId,
      code: cp.code,
      name: cp.name,
      description: cp.description || '',
      latitude: cp.latitude || -6.21461,
      longitude: cp.longitude || 106.81844,
      useCheckpointGeofence: cp.useCheckpointGeofence ?? true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenPrint = async (cp: Checkpoint) => {
    setPrintTarget(cp);
    try {
      const url = await checkpointsApi.getQrBlobUrl(cp.id);
      setQrBlobUrl(url);
    } catch {
      toast.error('Gagal mengambil gambar QR Code');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCheckpoint) {
      updateMutation.mutate({
        id: editingCheckpoint.id,
        payload: {
          name: formData.name,
          description: formData.description,
          latitude: formData.latitude,
          longitude: formData.longitude,
          useCheckpointGeofence: formData.useCheckpointGeofence,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const checkpoints = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <QrCode className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Manajemen Checkpoint & QR Patroli
          </h1>
          <p className="text-sm text-slate-500">
            Titik-titik pemeriksaan fisik satpam dengan QR terenkripsi HMAC anti-pemalsuan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={downloadAllMutation.isPending}
            className="text-xs"
          >
            {downloadAllMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Download All Checkpoint QR
          </Button>

          <Button onClick={handleOpenAdd} className="text-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Checkpoint
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            Tidak ada checkpoint ditemukan untuk situs ini.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode Titik</TableHead>
                <TableHead>Nama Checkpoint</TableHead>
                <TableHead>Instruksi / Catatan Pos</TableHead>
                <TableHead>GPS Koordinat</TableHead>
                <TableHead>Geofence Checkpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi & QR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkpoints.map((cp) => (
                <TableRow key={cp.id}>
                  <TableCell className="font-mono font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {cp.code}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {cp.name}
                    {cp.site?.name && (
                      <div className="text-[11px] font-normal text-slate-400">
                        {cp.site.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                    {cp.description || '-'}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    {cp.latitude ? `${cp.latitude}, ${cp.longitude}` : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {cp.useCheckpointGeofence ? (
                      <span className="text-emerald-600 font-medium">Khusus Titik</span>
                    ) : (
                      <span className="text-slate-400">Pusat Situs</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cp.active ? 'aman' : 'secondary'} className="text-[10px]">
                      {cp.active ? 'AKTIF' : 'NONAKTIF'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                      title="Cetak Stiker QR"
                      onClick={() => handleOpenPrint(cp)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                      title="Rotasi QR Token"
                      onClick={() => setRotateTarget(cp)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit Checkpoint"
                      onClick={() => handleOpenEdit(cp)}
                    >
                      <Edit className="h-4 w-4 text-slate-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Pagination meta={data?.pagination} onPageChange={setPage} isLoading={isLoading} />
      </div>

      {/* Modal Add / Edit */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCheckpoint ? 'Edit Data Checkpoint' : 'Tambah Checkpoint Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Pilih Situs</label>
                <select
                  required
                  disabled={!!editingCheckpoint}
                  value={formData.siteId}
                  onChange={(e) => {
                    const newSiteId = e.target.value;
                    const siteObj = sitesList.find((s) => s.id === newSiteId);
                    setFormData((prev) => ({
                      ...prev,
                      siteId: newSiteId,
                      ...(siteObj?.latitude && siteObj?.longitude
                        ? { latitude: siteObj.latitude, longitude: siteObj.longitude }
                        : {}),
                    }));
                  }}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Pilih Situs --</option>
                  {sitesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Kode Titik Checkpoint</label>
                <Input
                  required
                  placeholder="Contoh: CP-LOBBY-01"
                  value={formData.code}
                  disabled={!!editingCheckpoint}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Nama Checkpoint</label>
              <Input
                required
                placeholder="Contoh: Pintu Lobby Utama Lantai Dasar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Instruksi Pemeriksaan Khusus</label>
              <Input
                placeholder="Contoh: Periksa APAR, kunci pintu darurat, dan suhu ruangan panel"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="useCheckpointGeofence"
                checked={formData.useCheckpointGeofence}
                onChange={(e) =>
                  setFormData({ ...formData, useCheckpointGeofence: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-900"
              />
              <label
                htmlFor="useCheckpointGeofence"
                className="text-xs text-slate-700 dark:text-slate-300"
              >
                Gunakan koordinat titik ini untuk validasi toleransi GPS saat scan QR
              </label>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Pilih Titik Lokasi Presisi Checkpoint
              </label>
              <MapPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                radiusMeters={30}
                onChange={(coords) =>
                  setFormData((prev) => ({
                    ...prev,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                  }))
                }
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCheckpoint ? 'Simpan Perubahan' : 'Buat Checkpoint'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Rotate QR Confirmation */}
      <Dialog open={!!rotateTarget} onOpenChange={(open) => !open && setRotateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Rotasi QR Code Checkpoint?
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              Merotasi QR Code akan <strong>menghanguskan token lama</strong> seketika. Stiker fisik yang sudah terpasang di lapangan tidak akan bisa di-scan sebelum diganti dengan stiker baru hasil cetak ulang.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs font-medium">
            Checkpoint: <span className="font-bold">{rotateTarget?.name} ({rotateTarget?.code})</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={rotateMutation.isPending}
              onClick={() => rotateTarget && rotateMutation.mutate(rotateTarget.id)}
            >
              {rotateMutation.isPending ? 'Memproses...' : 'Ya, Rotasi QR Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Print QR Card Preview */}
      <Dialog open={!!printTarget} onOpenChange={(open) => !open && setPrintTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              Pratinjau Kartu Stiker QR Checkpoint
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center text-center space-y-3 bg-white text-slate-900 shadow-sm print:m-0 print:border-solid">
            <div className="font-bold text-sm tracking-wider uppercase text-slate-800 border-b pb-1 w-full">
              GuardSync Security Checkpoint
            </div>

            <div className="w-48 h-48 bg-slate-50 border border-slate-200 rounded flex items-center justify-center overflow-hidden">
              {qrBlobUrl ? (
                <img
                  src={qrBlobUrl}
                  alt={`QR ${printTarget?.code}`}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Skeleton className="h-40 w-40" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="text-base font-bold font-mono text-slate-900">
                {printTarget?.code}
              </div>
              <div className="text-xs font-semibold text-slate-700">
                {printTarget?.name}
              </div>
              <div className="text-[10px] text-slate-500">
                Scan dengan GuardSync Mobile saat berpatroli
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center pt-2">
            {qrBlobUrl && (
              <a
                href={qrBlobUrl}
                download={`qr-${printTarget?.code}.png`}
                className="inline-flex items-center text-xs font-medium text-blue-600 hover:underline"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Unduh File PNG
              </a>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPrintTarget(null)}>
                Tutup
              </Button>
              <Button onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-4 w-4" />
                Cetak Stiker
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}