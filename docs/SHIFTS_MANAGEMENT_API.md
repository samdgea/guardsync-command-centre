# Dokumentasi Teknis API: Manajemen Master Shift Kerja & Hak Akses (Global vs Site-Specific)
### GuardSync Backend API — Role-Based Access Control (SUPER_ADMIN vs ADMIN)

Dokumen ini merupakan spesifikasi teknis dan panduan integrasi lengkap untuk modul **Manajemen Master Shift Kerja** (`/shifts`), mencakup pemisahan wewenang antara **Super Admin** dan **Admin Biasa**, mekanisme **Global Shifts** vs **Site-Specific Shifts**, proteksi integritas data saat penghapusan (*in-use validation guard*), serta contoh lengkap **Request Body** dan **Response Body** untuk setiap endpoint dan kondisi error.

---

## 1. Arsitektur & Konsep Hak Akses

Sistem penugasan dan absensi satpam pada GuardSync membutuhkan fleksibilitas master jam kerja (shift) baik yang berlaku secara terpusat (seluruh pos jaga/situs) maupun khusus untuk satu situs operasional tertentu.

```
+--------------------------------------------------------------------------------------------------+
|                                    KLASIFIKASI MASTER SHIFT                                      |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|   1. GLOBAL SHIFTS (`site_id` = NULL)                                                            |
|      - Hanya dapat dibuat dan diubah oleh role `SUPER_ADMIN`.                                    |
|      - Berlaku & otomatis muncul di SELURUH situs (`GET /shifts?siteId=...`).                    |
|      - Contoh: Pola jam kerja standar nasional (Shift Pagi 07:00-19:00, Shift Malam 19:00-07:00, |
|        serta Hari Libur Reguler `DEFAULT_OFF_DAY`).                                              |
|      - Admin Biasa DILARANG menghapus atau mengubah Global Shift.                                |
|                                                                                                  |
|   2. SITE-SPECIFIC SHIFTS (`site_id` = UUID Site)                                                |
|      - Dibuat oleh `ADMIN` untuk situs yang berada dalam penugasannya, atau oleh `SUPER_ADMIN`.  |
|      - Hanya muncul dan berlaku pada situs yang bersangkutan.                                    |
|      - Contoh: Jam kerja khusus tenant mall, shift fleksibel pabrik, patroli gerbang tambang.    |
|      - Admin Biasa hanya dapat mengelola shift pada situs yang menjadi otoritasnya.              |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Matriks Hak Akses (RBAC Matrix)

Tabel berikut merangkum hak akses per role pengguna terhadap endpoint modul `/shifts`:

| Operasi / Endpoint | Method | Path | SUPER_ADMIN | ADMIN (Biasa) | SUPERVISOR / OFFICER |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **Daftar Shift** | `GET` | `/shifts` | Semua shift | Site miliknya + Global Shifts | Site miliknya + Global Shifts |
| **Detail Shift** | `GET` | `/shifts/{id}` | Ya | Ya | Ya |
| **Buat Global Shift** | `POST` | `/shifts` (`siteId`: null) | **Bisa (Diizinkan)** | **Ditolak (422 / 400)** | Ditolak (403) |
| **Buat Site Shift** | `POST` | `/shifts` (`siteId`: UUID) | Bisa (Semua site) | Bisa (Hanya site otoritas) | Ditolak (403) |
| **Update Global Shift** | `PATCH` | `/shifts/{id}` | **Bisa\*** | **Ditolak (403)** | Ditolak (403) |
| **Update Site Shift** | `PATCH` | `/shifts/{id}` | **Bisa\*** | **Bisa\* (Hanya site otoritas)** | Ditolak (403) |
| **Hapus Global Shift** | `DELETE` | `/shifts/{id}` | **Bisa\*** | **Ditolak (403)** | Ditolak (403) |
| **Hapus Site Shift** | `DELETE` | `/shifts/{id}` | **Bisa\*** | **Bisa\* (Hanya site otoritas)** | Ditolak (403) |

> [!IMPORTANT]
> **\*) Catatan Mutlak Proteksi Integritas Data (In-Use Guard — Hapus & Edit):**
> Baik `SUPER_ADMIN` maupun `ADMIN` **TIDAK DAPAT** menghapus (`DELETE`) maupun mengubah/mengedit (`PATCH`) shift yang **sedang dipakai / di-assign** pada:
> 1. Penugasan aktif petugas (`site_assignments.shift_id`).
> 2. Pola rotasi shift perorangan (`site_assignments.shift_pattern`).
> 3. Pola rotasi tim roster situs (`roster_teams.shift_pattern`).
> 4. Riwayat log absensi kehadiran (`attendances.shift_id`).
>
> Jika shift sedang dipakai:
> - Request penghapusan (`DELETE`) akan ditolak dengan **HTTP 400 Bad Request** ("*Shift sedang digunakan dan tidak dapat dihapus*").
> - Request pengubahan/edit (`PATCH`) akan ditolak dengan **HTTP 400 Bad Request** ("*Shift sedang digunakan dan tidak dapat diubah*"). Seluruh jenis pengubahan (termasuk status aktif/nonaktif) ditolak selama shift masih terikat dengan penugasan/absensi aktif.
>
> Agar shift dapat diedit atau dihapus, admin wajib mengalihkan (*unassign* atau migrasi ke shift lain) seluruh petugas dan tim roster yang menggunakan shift tersebut terlebih dahulu. Hal yang sama berlaku untuk **Susunan Roster (Roster Team)**: Admin site lain dilarang mengubah/menghapus roster site lain, dan roster team yang masih memiliki penugasan petugas aktif tidak dapat dihapus.

---

## 3. Alur Kerja (Workflow Diagrams)

### 3.1 Pembuatan Shift (Create Shift Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web / Client App
    participant Middleware as JwtAuth & Role Middleware
    participant Controller as ShiftController
    participant Service as SiteScopeService
    participant DB as Database (shifts)

    Client->>Middleware: POST /shifts (payload)
    Middleware->>Middleware: Verifikasi JWT & Periksa Role (SUPER_ADMIN / ADMIN)
    
    alt Role ADMIN Biasa
        alt siteId kosong / null
            Middleware-->>Client: 422 Unprocessable Content ("siteId wajib diisi untuk Admin biasa")
        else siteId diisi
            Controller->>Service: assertSiteAccess(scope, siteId)
            alt Tidak memiliki akses ke Site tersebut
                Service-->>Client: 403 Forbidden ("Akses ditolak")
            else Akses Valid
                Controller->>DB: INSERT into shifts (site_id, ...)
                DB-->>Controller: Shift Created
                Controller-->>Client: 201 Created (Shift site-specific berhasil dibuat)
            end
        end
    else Role SUPER_ADMIN
        Controller->>DB: INSERT into shifts (site_id: nullable, ...)
        DB-->>Controller: Shift Created
        Controller-->>Client: 201 Created (Global Shift / Site Shift berhasil dibuat)
    end
```

---

### 3.2 Penghapusan Shift & Validasi "Tidak Dipakai" (Delete Shift Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web / Client App
    participant Middleware as JwtAuth & Role Middleware
    participant Controller as ShiftController
    participant Guard as ShiftInUseValidator
    participant DB as Database (shifts)

    Client->>Middleware: DELETE /shifts/{id}
    Middleware->>Middleware: Verifikasi JWT & Periksa Role (SUPER_ADMIN / ADMIN)
    Controller->>DB: Cari shift berdasarkan ID
    alt Shift tidak ditemukan
        Controller-->>Client: 404 Not Found ("Shift tidak ditemukan")
    end

    alt Role ADMIN Biasa
        alt shift.site_id IS NULL (Global Shift)
            Controller-->>Client: 403 Forbidden ("Hanya Super Admin yang dapat menghapus shift global")
        else shift.site_id milik site di luar otoritas
            Controller-->>Client: 403 Forbidden ("Akses ditolak")
        end
    end

    Note over Controller, Guard: Pengecekan Integritas: Apakah shift sedang dipakai / di-assign?
    Controller->>Guard: Periksa keterkaitan data (assignments, roster, attendances)
    alt Shift sedang digunakan (In-Use)
        Guard-->>Controller: Terdeteksi sedang dipakai
        Controller-->>Client: 400 Bad Request ("Shift sedang digunakan dan tidak dapat dihapus")
    else Shift tidak digunakan
        Controller->>DB: DELETE FROM shifts WHERE id = {id}
        DB-->>Controller: Deleted
        Controller-->>Client: 200 OK ("Shift berhasil dihapus")
    end
```

---

## 4. Spesifikasi Endpoint Lengkap

---

### 4.1 Buat Master Shift Baru (`POST /shifts`)

Membuat master shift baru. Super Admin dapat membuat Global Shift (tanpa `siteId`) atau Site Shift. Admin biasa **wajib** menyertakan `siteId` yang berada dalam wilayah otoritas penugasannya.

* **Endpoint**: `POST /shifts`
* **Method**: `POST`
* **Role**: `SUPER_ADMIN`, `ADMIN`
* **Headers**:
  * `Authorization`: `Bearer <token>` (Wajib)
  * `Content-Type`: `application/json` (Wajib)
  * `Accept-Language`: `id` atau `en` (Opsional, default: `id`)

#### Request Body Schema:
| Field | Tipe | Wajib? | Keterangan |
| :--- | :--- | :---: | :--- |
| `siteId` | `string (uuid)` | **Kondisional** | **Wajib bagi ADMIN biasa**. Opsional bagi `SUPER_ADMIN`. Jika `null`/dikosongkan oleh Super Admin, shift menjadi **Global Shift**. |
| `code` | `string` | Opsional | Kode unik identifikasi shift (contoh: `SHIFT_PAGI_SITE_A`). Maks. 50 karakter. Harus unik dalam tabel `shifts`. |
| `name` | `string` | **Wajib** | Nama shift kerja (contoh: `Shift Pagi`, `Shift Malam Tambang`). Maks. 100 karakter. |
| `startTime` | `string (time)` | Kondisional | Format `HH:mm:ss` atau `HH:mm`. Wajib jika `isOff: false`. |
| `endTime` | `string (time)` | Kondisional | Format `HH:mm:ss` atau `HH:mm`. Wajib jika `isOff: false`. Mendukung lintas malam (*overnight*). |
| `lateToleranceMinutes` | `integer` | Opsional | Toleransi keterlambatan check-in dalam menit (Default: `15`, min: 0, maks: 360). |
| `isOff` | `boolean` | Opsional | Penanda hari libur/off dinas (Default: `false`). Jika `true`, jam mulai/selesai opsional/dapat bernilai `null`. |
| `active` | `boolean` | Opsional | Status keaktifan shift (Default: `true`). |

---

#### Contoh 1: Super Admin Membuat Global Shift (Tanpa `siteId`)

##### Request Header:
```http
POST /shifts HTTP/1.1
Host: api.guardsync.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept-Language: id
```

##### Request Body:
```json
{
  "code": "GLOBAL_SHIFT_PAGI",
  "name": "Shift Pagi Terpusat (Nasional)",
  "startTime": "07:00:00",
  "endTime": "19:00:00",
  "lateToleranceMinutes": 15,
  "isOff": false,
  "active": true
}
```

##### Response Body (201 Created):
```json
{
  "success": true,
  "message": "Shift berhasil dibuat",
  "data": {
    "id": "7a9e145c-f092-4f33-8a30-2b109520cb12",
    "siteId": null,
    "code": "GLOBAL_SHIFT_PAGI",
    "site": null,
    "name": "Shift Pagi Terpusat (Nasional)",
    "startTime": "07:00:00",
    "endTime": "19:00:00",
    "lateToleranceMinutes": 15,
    "isOvernight": false,
    "isOff": false,
    "active": true,
    "createdAt": "2026-10-02T10:00:00.000000Z",
    "updatedAt": "2026-10-02T10:00:00.000000Z"
  }
}
```

---

#### Contoh 2: Admin Biasa Membuat Shift Site Tertentu

##### Request Header:
```http
POST /shifts HTTP/1.1
Host: api.guardsync.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept-Language: id
```

##### Request Body:
```json
{
  "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
  "code": "SITE_A_SORE",
  "name": "Shift Sore Pos A",
  "startTime": "15:00:00",
  "endTime": "23:00:00",
  "lateToleranceMinutes": 10,
  "isOff": false,
  "active": true
}
```

##### Response Body (201 Created):
```json
{
  "success": true,
  "message": "Shift berhasil dibuat",
  "data": {
    "id": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
    "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
    "code": "SITE_A_SORE",
    "site": {
      "id": "9d35a58a-36b0-4cfa-811c-d760775d7101",
      "name": "Head Office Jakarta",
      "code": "HO-JKT"
    },
    "name": "Shift Sore Pos A",
    "startTime": "15:00:00",
    "endTime": "23:00:00",
    "lateToleranceMinutes": 10,
    "isOvernight": false,
    "isOff": false,
    "active": true,
    "createdAt": "2026-10-02T10:15:00.000000Z",
    "updatedAt": "2026-10-02T10:15:00.000000Z"
  }
}
```

---

#### Contoh 3: Membuat Shift Malam Lintas Hari (*Overnight Shift*)

##### Request Body:
```json
{
  "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
  "code": "SITE_A_MALAM",
  "name": "Shift Malam Patroli",
  "startTime": "23:00:00",
  "endTime": "07:00:00",
  "lateToleranceMinutes": 15,
  "isOff": false
}
```

##### Response Body (201 Created — `isOvernight: true` otomatis terdeteksi):
```json
{
  "success": true,
  "message": "Shift berhasil dibuat",
  "data": {
    "id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
    "code": "SITE_A_MALAM",
    "site": {
      "id": "9d35a58a-36b0-4cfa-811c-d760775d7101",
      "name": "Head Office Jakarta",
      "code": "HO-JKT"
    },
    "name": "Shift Malam Patroli",
    "startTime": "23:00:00",
    "endTime": "07:00:00",
    "lateToleranceMinutes": 15,
    "isOvernight": true,
    "isOff": false,
    "active": true,
    "createdAt": "2026-10-02T10:20:00.000000Z",
    "updatedAt": "2026-10-02T10:20:00.000000Z"
  }
}
```

---

#### Contoh 4: Membuat Master Hari Libur / Off (`isOff: true`)

##### Request Body:
```json
{
  "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
  "code": "SITE_A_LIBUR_MINGGUAN",
  "name": "Libur Giliran Pos A",
  "isOff": true,
  "active": true
}
```

##### Response Body (201 Created):
```json
{
  "success": true,
  "message": "Shift berhasil dibuat",
  "data": {
    "id": "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
    "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
    "code": "SITE_A_LIBUR_MINGGUAN",
    "site": {
      "id": "9d35a58a-36b0-4cfa-811c-d760775d7101",
      "name": "Head Office Jakarta",
      "code": "HO-JKT"
    },
    "name": "Libur Giliran Pos A",
    "startTime": null,
    "endTime": null,
    "lateToleranceMinutes": 15,
    "isOvernight": false,
    "isOff": true,
    "active": true,
    "createdAt": "2026-10-02T10:25:00.000000Z",
    "updatedAt": "2026-10-02T10:25:00.000000Z"
  }
}
```

---

#### Response Error pada `POST /shifts`:

##### Error 1: Admin Biasa Mencoba Membuat Shift Tanpa `siteId` (422 Unprocessable Content)
```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {
    "siteId": [
      "ID situs wajib diisi untuk admin biasa."
    ]
  }
}
```

##### Error 2: Admin Biasa Mencoba Membuat Shift pada Site di Luar Otoritasnya (403 Forbidden)
```json
{
  "success": false,
  "message": "Akses ditolak"
}
```

##### Error 3: Validasi Format Jam Kerja Tidak Valid / Kurang Field Wajib (422 Unprocessable Content)
```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {
    "name": [
      "Bidang nama wajib diisi."
    ],
    "startTime": [
      "Format waktu mulai tidak cocok dengan format H:i:s,H:i."
    ]
  }
}
```

##### Error 4: Kode Shift Duplikat (422 Unprocessable Content)
```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {
    "code": [
      "Kode shift sudah digunakan."
    ]
  }
}
```

---

### 4.2 Daftar Master Shift (`GET /shifts`)

Mengambil daftar master shift. Jika parameter `siteId` disertakan, API akan mengembalikan gabungan shift khusus situs tersebut **beserta seluruh Global Shift** (`site_id IS NULL`).

* **Endpoint**: `GET /shifts`
* **Method**: `GET`
* **Role**: Semua Role terautentikasi (`SUPER_ADMIN`, `ADMIN`, `SUPERVISOR`, `OFFICER`)
* **Headers**:
  * `Authorization`: `Bearer <token>` (Wajib)
  * `Accept-Language`: `id` atau `en` (Opsional, default: `id`)
* **Query Parameters**:
  * `siteId` (string, uuid, opsional): Filter berdasarkan situs. Jika diisi, otomatis menyertakan Global Shifts.
  * `activeOnly` (boolean, opsional, default: `true`): Hanya tampilkan shift yang berstatus aktif.

---

#### Contoh 1: Query dengan Parameter `siteId` (Menggabungkan Shift Site & Global Shifts)

##### Request:
```http
GET /shifts?siteId=9d35a58a-36b0-4cfa-811c-d760775d7101&activeOnly=true HTTP/1.1
Host: api.guardsync.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept-Language: id
```

##### Response Body (200 OK):
```json
{
  "success": true,
  "message": "Daftar shift berhasil diambil",
  "data": [
    {
      "id": "7a9e145c-f092-4f33-8a30-2b109520cb12",
      "siteId": null,
      "code": "DEFAULT_SHIFT_PAGI",
      "site": null,
      "name": "Shift Pagi (Nasional)",
      "startTime": "07:00:00",
      "endTime": "19:00:00",
      "lateToleranceMinutes": 15,
      "isOvernight": false,
      "isOff": false,
      "active": true,
      "createdAt": "2026-10-01T00:00:00.000000Z",
      "updatedAt": "2026-10-01T00:00:00.000000Z"
    },
    {
      "id": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
      "siteId": null,
      "code": "DEFAULT_SHIFT_MALAM",
      "site": null,
      "name": "Shift Malam (Nasional)",
      "startTime": "19:00:00",
      "endTime": "07:00:00",
      "lateToleranceMinutes": 15,
      "isOvernight": true,
      "isOff": false,
      "active": true,
      "createdAt": "2026-10-01T00:00:00.000000Z",
      "updatedAt": "2026-10-01T00:00:00.000000Z"
    },
    {
      "id": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
      "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
      "code": "SITE_A_SORE",
      "site": {
        "id": "9d35a58a-36b0-4cfa-811c-d760775d7101",
        "name": "Head Office Jakarta",
        "code": "HO-JKT"
      },
      "name": "Shift Sore Pos A",
      "startTime": "15:00:00",
      "endTime": "23:00:00",
      "lateToleranceMinutes": 10,
      "isOvernight": false,
      "isOff": false,
      "active": true,
      "createdAt": "2026-10-02T10:15:00.000000Z",
      "updatedAt": "2026-10-02T10:15:00.000000Z"
    }
  ]
}
```

---

#### Contoh 2: Super Admin Query Semua Shift Tanpa Parameter `siteId`

##### Request:
```http
GET /shifts HTTP/1.1
Host: api.guardsync.com
Authorization: Bearer <SUPER_ADMIN_TOKEN>
```

##### Response Body (200 OK):
Mengembalikan seluruh daftar shift di database (baik yang memiliki `site_id` maupun Global Shifts).

---

### 4.3 Detail Shift (`GET /shifts/{id}`)

Melihat data lengkap satu master shift berdasarkan UUID.

* **Endpoint**: `GET /shifts/{id}`
* **Method**: `GET`
* **Role**: Semua Role terautentikasi
* **Headers**: `Authorization: Bearer <token>`
* **Path Parameter**:
  * `id` (string, uuid, wajib): UUID shift yang ingin dilihat.

---

#### Contoh Request:
```http
GET /shifts/7a9e145c-f092-4f33-8a30-2b109520cb12 HTTP/1.1
Host: api.guardsync.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept-Language: id
```

#### Response Body (200 OK):
```json
{
  "success": true,
  "message": "Shift berhasil diambil",
  "data": {
    "id": "7a9e145c-f092-4f33-8a30-2b109520cb12",
    "siteId": null,
    "code": "GLOBAL_SHIFT_PAGI",
    "site": null,
    "name": "Shift Pagi Terpusat (Nasional)",
    "startTime": "07:00:00",
    "endTime": "19:00:00",
    "lateToleranceMinutes": 15,
    "isOvernight": false,
    "isOff": false,
    "active": true,
    "createdAt": "2026-10-02T10:00:00.000000Z",
    "updatedAt": "2026-10-02T10:00:00.000000Z"
  }
}
```

#### Response Error: Shift Tidak Ditemukan (404 Not Found)
```json
{
  "success": false,
  "message": "Shift tidak ditemukan"
}
```

---

### 4.4 Perbarui Shift (`PATCH /shifts/{id}`)

Memperbarui atribut master shift secara parsial. Super Admin dapat memperbarui semua shift yang sedang tidak dipakai. Admin biasa **hanya dapat memperbarui shift pada situs miliknya yang sedang tidak dipakai**, dan **dilarang keras mengubah Global Shift** maupun mengubah `siteId` menjadi `null`.

> [!CAUTION]
> **Proteksi In-Use Guard pada Pengubahan (Edit / Update):**
> Shift yang sedang dipakai / memiliki penugasan aktif (`site_assignments.shift_id`, `shift_pattern`, `roster_teams.shift_pattern`, atau `attendances.shift_id`) **TIDAK DAPAT DIEDIT SAMA SEKALI** (seluruh jenis edit termasuk jam kerja, kode, toleransi, maupun status aktif akan ditolak dengan **HTTP 400 Bad Request**). Pengguna harus mengalihkan penugasan (*unassign*) petugas/tim terlebih dahulu sebelum dapat mengubah data shift tersebut.

* **Endpoint**: `PATCH /shifts/{id}`
* **Method**: `PATCH`
* **Role**: `SUPER_ADMIN`, `ADMIN`
* **Headers**:
  * `Authorization`: `Bearer <token>` (Wajib)
  * `Content-Type`: `application/json` (Wajib)
  * `Accept-Language`: `id` atau `en` (Opsional)
* **Path Parameter**:
  * `id` (string, uuid, wajib): UUID shift yang ingin diubah.

#### Request Body Schema (Seluruh Field Bersifat Opsional):
| Field | Tipe | Keterangan |
| :--- | :--- | :--- |
| `name` | `string` | Nama baru shift. |
| `code` | `string` | Kode baru shift (harus unik). |
| `siteId` | `string (uuid)` | ID situs baru. **Admin biasa dilarang mengubah field ini menjadi null**. |
| `startTime` | `string (time)` | Waktu mulai baru (`HH:mm:ss` atau `HH:mm`). |
| `endTime` | `string (time)` | Waktu selesai baru (`HH:mm:ss` atau `HH:mm`). |
| `lateToleranceMinutes` | `integer` | Toleransi keterlambatan baru (0-360). |
| `isOff` | `boolean` | Status hari libur. |
| `active` | `boolean` | Status keaktifan (dapat di-set `false` untuk deaktifkan jika shift sedang tidak dipakai). |

---

#### Contoh 1: Perubahan Jam Kerja & Toleransi Menit (Shift Bebas Penugasan)

##### Request Body:
```json
{
  "name": "Shift Sore Penyesuaian Ramadhan",
  "startTime": "15:30:00",
  "endTime": "23:30:00",
  "lateToleranceMinutes": 20
}
```

##### Response Body (200 OK):
```json
{
  "success": true,
  "message": "Shift berhasil diperbarui",
  "data": {
    "id": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
    "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
    "code": "SITE_A_SORE",
    "site": {
      "id": "9d35a58a-36b0-4cfa-811c-d760775d7101",
      "name": "Head Office Jakarta",
      "code": "HO-JKT"
    },
    "name": "Shift Sore Penyesuaian Ramadhan",
    "startTime": "15:30:00",
    "endTime": "23:30:00",
    "lateToleranceMinutes": 20,
    "isOvernight": false,
    "isOff": false,
    "active": true,
    "createdAt": "2026-10-02T10:15:00.000000Z",
    "updatedAt": "2026-10-02T11:00:00.000000Z"
  }
}
```

---

#### Contoh 2: Menonaktifkan Shift (*Soft Deactivation* — Shift Bebas Penugasan)

Menonaktifkan shift yang sudah tidak digunakan oleh petugas atau tim roster mana pun agar tidak muncul lagi pada opsi penugasan baru.

##### Request Body:
```json
{
  "active": false
}
```

##### Response Body (200 OK):
```json
{
  "success": true,
  "message": "Shift berhasil diperbarui",
  "data": {
    "id": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
    "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
    "code": "SITE_A_SORE",
    "site": {
      "id": "9d35a58a-36b0-4cfa-811c-d760775d7101",
      "name": "Head Office Jakarta",
      "code": "HO-JKT"
    },
    "name": "Shift Sore Pos A",
    "startTime": "15:00:00",
    "endTime": "23:00:00",
    "lateToleranceMinutes": 10,
    "isOvernight": false,
    "isOff": false,
    "active": false,
    "createdAt": "2026-10-02T10:15:00.000000Z",
    "updatedAt": "2026-10-02T11:05:00.000000Z"
  }
}
```

---

#### Response Error pada `PATCH /shifts/{id}`:

##### Error 1: Admin Biasa Mencoba Mengubah Global Shift (403 Forbidden)
```json
{
  "success": false,
  "message": "Hanya super admin yang dapat mengubah shift global"
}
```

##### Error 2: Admin Biasa Mencoba Mengubah Shift Milik Situs Lain (403 Forbidden)
```json
{
  "success": false,
  "message": "Akses ditolak"
}
```

##### Error 3: Shift Target Tidak Ditemukan (404 Not Found)
```json
{
  "success": false,
  "message": "Shift tidak ditemukan"
}
```

##### Error 4: Shift Sedang Digunakan / Ditugaskan / Memiliki Riwayat Absensi (400 Bad Request)
Sistem menolak segala bentuk pengubahan (edit) shift jika shift masih aktif dipakai / di-assign pada:
1. `site_assignments.shift_id`
2. `site_assignments.shift_pattern`
3. `roster_teams.shift_pattern`
4. `attendances.shift_id`

```json
{
  "success": false,
  "message": "Shift sedang digunakan dan tidak dapat diubah",
  "errors": {
    "shift": [
      "Shift tidak dapat diubah karena masih ditugaskan pada petugas, terdaftar di roster tim, atau memiliki riwayat absensi."
    ]
  }
}
```

---

### 4.5 Hapus Shift (`DELETE /shifts/{id}`)

Menghapus master shift dari database secara permanen. Proteksi ganda diterapkan: otorisasi role dan pemeriksaan keterkaitan data (*in-use check*).

* **Endpoint**: `DELETE /shifts/{id}`
* **Method**: `DELETE`
* **Role**: `SUPER_ADMIN`, `ADMIN`
* **Headers**:
  * `Authorization`: `Bearer <token>` (Wajib)
  * `Accept-Language`: `id` atau `en` (Opsional)
* **Path Parameter**:
  * `id` (string, uuid, wajib): UUID shift yang ingin dihapus.

---

#### Contoh Request Sukses:
```http
DELETE /shifts/1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e HTTP/1.1
Host: api.guardsync.com
Authorization: Bearer <SUPER_ADMIN_OR_ASSIGNED_ADMIN_TOKEN>
Accept-Language: id
```

#### Response Sukses (200 OK):
```json
{
  "success": true,
  "message": "Shift berhasil dihapus"
}
```

---

#### Response Error pada `DELETE /shifts/{id}`:

##### Error 1: Admin Biasa Mencoba Menghapus Global Shift (403 Forbidden)
Admin biasa dilarang menghapus shift yang tidak memiliki `site_id`.
```json
{
  "success": false,
  "message": "Hanya super admin yang dapat menghapus shift global"
}
```

##### Error 2: Admin Biasa Mencoba Menghapus Shift Milik Situs di Luar Otoritasnya (403 Forbidden)
```json
{
  "success": false,
  "message": "Akses ditolak"
}
```

##### Error 3: Shift Sedang Digunakan / Ditugaskan / Memiliki Riwayat Absensi (400 Bad Request)
Sistem menolak penghapusan shift jika shift masih di-assign pada salah satu dari:
1. `site_assignments.shift_id`
2. `site_assignments.shift_pattern`
3. `roster_teams.shift_pattern`
4. `attendances.shift_id`

```json
{
  "success": false,
  "message": "Shift sedang digunakan dan tidak dapat dihapus",
  "errors": {
    "shift": [
      "Shift tidak dapat dihapus karena masih ditugaskan pada petugas, terdaftar di roster tim, atau memiliki riwayat absensi."
    ]
  }
}
```

##### Error 4: Shift Tidak Ditemukan (404 Not Found)
```json
{
  "success": false,
  "message": "Shift tidak ditemukan"
}
```

---

## 5. Endpoint Terkait Jadwal & Roster Shift

Berikut adalah dokumentasi endpoint pendukung yang mengonsumsi data master shift untuk kebutuhan jadwal dan operasional satpam:

---

### 5.1 Jadwal Giliran Shift Pribadi Petugas (`GET /shifts/my-schedule`)

Menampilkan kalender jadwal shift harian milik petugas yang sedang login berdasarkan pola giliran siklik (*infinite cycle rotation*) atau jam kerja tetap.

* **Endpoint**: `GET /shifts/my-schedule`
* **Method**: `GET`
* **Role**: Semua Role terautentikasi (Utamanya `OFFICER`)
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `siteId` (string, uuid, opsional): Filter penugasan situs tertentu (jika petugas ditugaskan di >1 site).
  * `startDate` (string, format `YYYY-MM-DD`, opsional, default: hari ini).
  * `days` (integer, opsional, default: `14`, contoh: `7`, `14`, `30`).

#### Contoh Request:
```http
GET /shifts/my-schedule?days=7 HTTP/1.1
Host: api.guardsync.com
Authorization: Bearer <OFFICER_TOKEN>
Accept-Language: id
```

#### Contoh Response Body (200 OK):
```json
{
  "success": true,
  "message": "Jadwal shift berhasil diambil",
  "data": {
    "site": {
      "id": "9d35a58a-36b0-4cfa-811c-d760775d7101",
      "name": "Head Office Jakarta",
      "code": "HO-JKT"
    },
    "scheduleType": "ROSTER",
    "rosterTeam": {
      "id": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
      "code": "REGU_A",
      "name": "Regu Harimau A"
    },
    "workDays": null,
    "shiftPattern": [
      "DEFAULT_SHIFT_PAGI",
      "DEFAULT_SHIFT_PAGI",
      "DEFAULT_SHIFT_MALAM",
      "DEFAULT_SHIFT_MALAM",
      "DEFAULT_OFF_DAY",
      "DEFAULT_OFF_DAY"
    ],
    "patternStartDate": "2026-10-01",
    "schedule": [
      {
        "date": "2026-10-01",
        "dayOfWeek": 4,
        "dayName": "Thursday",
        "isOff": false,
        "shift": {
          "id": "7a9e145c-f092-4f33-8a30-2b109520cb12",
          "code": "DEFAULT_SHIFT_PAGI",
          "name": "Shift Pagi",
          "startTime": "07:00:00",
          "endTime": "19:00:00",
          "lateToleranceMinutes": 15,
          "isOvernight": false,
          "isOff": false
        }
      },
      {
        "date": "2026-10-02",
        "dayOfWeek": 5,
        "dayName": "Friday",
        "isOff": false,
        "shift": {
          "id": "7a9e145c-f092-4f33-8a30-2b109520cb12",
          "code": "DEFAULT_SHIFT_PAGI",
          "name": "Shift Pagi",
          "startTime": "07:00:00",
          "endTime": "19:00:00",
          "lateToleranceMinutes": 15,
          "isOvernight": false,
          "isOff": false
        }
      },
      {
        "date": "2026-10-03",
        "dayOfWeek": 6,
        "dayName": "Saturday",
        "isOff": false,
        "shift": {
          "id": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
          "code": "DEFAULT_SHIFT_MALAM",
          "name": "Shift Malam",
          "startTime": "19:00:00",
          "endTime": "07:00:00",
          "lateToleranceMinutes": 15,
          "isOvernight": true,
          "isOff": false
        }
      },
      {
        "date": "2026-10-04",
        "dayOfWeek": 7,
        "dayName": "Sunday",
        "isOff": false,
        "shift": {
          "id": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
          "code": "DEFAULT_SHIFT_MALAM",
          "name": "Shift Malam",
          "startTime": "19:00:00",
          "endTime": "07:00:00",
          "lateToleranceMinutes": 15,
          "isOvernight": true,
          "isOff": false
        }
      },
      {
        "date": "2026-10-05",
        "dayOfWeek": 1,
        "dayName": "Monday",
        "isOff": true,
        "shift": {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "code": "DEFAULT_OFF_DAY",
          "name": "Hari Libur Reguler",
          "startTime": null,
          "endTime": null,
          "lateToleranceMinutes": 0,
          "isOvernight": false,
          "isOff": true
        }
      },
      {
        "date": "2026-10-06",
        "dayOfWeek": 2,
        "dayName": "Tuesday",
        "isOff": true,
        "shift": {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "code": "DEFAULT_OFF_DAY",
          "name": "Hari Libur Reguler",
          "startTime": null,
          "endTime": null,
          "lateToleranceMinutes": 0,
          "isOvernight": false,
          "isOff": true
        }
      },
      {
        "date": "2026-10-07",
        "dayOfWeek": 3,
        "dayName": "Wednesday",
        "isOff": false,
        "shift": {
          "id": "7a9e145c-f092-4f33-8a30-2b109520cb12",
          "code": "DEFAULT_SHIFT_PAGI",
          "name": "Shift Pagi",
          "startTime": "07:00:00",
          "endTime": "19:00:00",
          "lateToleranceMinutes": 15,
          "isOvernight": false,
          "isOff": false
        }
      }
    ]
  }
}
```

---

### 5.2 Rekap Roster Seluruh Petugas di Situs (`GET /shifts/roster`)

Menampilkan matriks roster seluruh petugas yang bertugas pada situs tertentu untuk rentang tanggal tertentu. Berguna untuk dashboard Command Centre supervisor.

* **Endpoint**: `GET /shifts/roster`
* **Method**: `GET`
* **Role**: `SUPER_ADMIN`, `ADMIN`, `SUPERVISOR`
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `siteId` (string, uuid, wajib): ID situs yang ingin dilihat rosternya.
  * `startDate` (string, `YYYY-MM-DD`, opsional, default: hari ini).
  * `days` (integer, opsional, default: `7`).

#### Contoh Request:
```http
GET /shifts/roster?siteId=9d35a58a-36b0-4cfa-811c-d760775d7101&days=2 HTTP/1.1
Host: api.guardsync.com
Authorization: Bearer <ADMIN_TOKEN>
Accept-Language: id
```

#### Contoh Response Body (200 OK):
```json
{
  "success": true,
  "message": "Jadwal giliran shift berhasil diambil",
  "data": {
    "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
    "startDate": "2026-10-02",
    "endDate": "2026-10-03",
    "roster": [
      {
        "assignmentId": "a1b2c3d4-1111-2222-3333-444455556666",
        "user": {
          "id": "b2c3d4e5-2222-3333-4444-555566667777",
          "name": "Budi Santoso",
          "employeeId": "OF-001"
        },
        "scheduleType": "ROSTER",
        "rosterTeam": {
          "id": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
          "code": "REGU_A",
          "name": "Regu Harimau A"
        },
        "workDays": null,
        "shiftPattern": [
          "DEFAULT_SHIFT_PAGI",
          "DEFAULT_SHIFT_MALAM",
          "DEFAULT_OFF_DAY"
        ],
        "patternStartDate": "2026-10-01",
        "schedule": [
          {
            "date": "2026-10-02",
            "dayOfWeek": 5,
            "dayName": "Friday",
            "isOff": false,
            "shift": {
              "id": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
              "code": "DEFAULT_SHIFT_MALAM",
              "name": "Shift Malam",
              "startTime": "19:00:00",
              "endTime": "07:00:00",
              "lateToleranceMinutes": 15,
              "isOvernight": true,
              "isOff": false
            }
          },
          {
            "date": "2026-10-03",
            "dayOfWeek": 6,
            "dayName": "Saturday",
            "isOff": true,
            "shift": {
              "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
              "code": "DEFAULT_OFF_DAY",
              "name": "Hari Libur Reguler",
              "startTime": null,
              "endTime": null,
              "lateToleranceMinutes": 0,
              "isOvernight": false,
              "isOff": true
            }
          }
        ]
      }
    ]
  }
}
```

---

### 5.3 Tim Roster di Situs (`GET /shifts/teams`)

Mengambil daftar tim roster (regu satpam) yang dikonfigurasi pada situs tertentu.

* **Endpoint**: `GET /shifts/teams`
* **Method**: `GET`
* **Role**: Semua Role terautentikasi
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `siteId` (string, uuid, opsional): ID situs.

#### Contoh Response Body (200 OK):
```json
{
  "success": true,
  "message": "Daftar tim roster berhasil diambil",
  "data": [
    {
      "id": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
      "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
      "code": "REGU_A",
      "name": "Regu Harimau A",
      "shiftPattern": [
        "DEFAULT_SHIFT_PAGI",
        "DEFAULT_SHIFT_PAGI",
        "DEFAULT_SHIFT_MALAM",
        "DEFAULT_SHIFT_MALAM",
        "DEFAULT_OFF_DAY",
        "DEFAULT_OFF_DAY"
      ],
      "patternStartDate": "2026-10-01",
      "active": true
    },
    {
      "id": "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
      "siteId": "9d35a58a-36b0-4cfa-811c-d760775d7101",
      "code": "REGU_B",
      "name": "Regu Elang B",
      "shiftPattern": [
        "DEFAULT_SHIFT_MALAM",
        "DEFAULT_SHIFT_MALAM",
        "DEFAULT_OFF_DAY",
        "DEFAULT_OFF_DAY",
        "DEFAULT_SHIFT_PAGI",
        "DEFAULT_SHIFT_PAGI"
      ],
      "patternStartDate": "2026-10-01",
      "active": true
    }
  ]
}
```

---

## 6. Ringkasan Kamus Terjemahan Pesan (Localization Dictionary)

Berikut adalah pemetaan pesan respon pada `App\Support\ApiResponse`:

| Key Bahasa Inggris | Terjemahan Bahasa Indonesia (`Accept-Language: id`) | Status HTTP |
| :--- | :--- | :---: |
| `Shifts retrieved successfully` | `Daftar shift berhasil diambil` | 200 |
| `Shift created successfully` | `Shift berhasil dibuat` | 201 |
| `Shift retrieved successfully` | `Shift berhasil diambil` | 200 |
| `Shift updated successfully` | `Shift berhasil diperbarui` | 200 |
| `Shift deleted successfully` | `Shift berhasil dihapus` | 200 |
| `Shift not found` | `Shift tidak ditemukan` | 404 |
| `Shift is currently in use and cannot be deleted` | `Shift sedang digunakan dan tidak dapat dihapus` | 400 |
| `Shift is currently in use and cannot be modified` | `Shift sedang digunakan dan tidak dapat diubah` | 400 |
| `Roster team is currently in use and cannot be deleted` | `Tim roster sedang digunakan dan tidak dapat dihapus` | 400 |
| `Only super admin can delete global shifts` | `Hanya super admin yang dapat menghapus shift global` | 403 |
| `Only super admin can modify global shifts` | `Hanya super admin yang dapat mengubah shift global` | 403 |
| `Site ID is required for regular admin` | `ID situs wajib diisi untuk admin biasa` | 422 |
| `Forbidden` | `Akses ditolak` | 403 |
| `Shift schedule retrieved successfully` | `Jadwal shift berhasil diambil` | 200 |
| `Shift roster retrieved successfully` | `Jadwal giliran shift berhasil diambil` | 200 |
| `Roster teams retrieved successfully` | `Daftar tim roster berhasil diambil` | 200 |

---

## 7. Panduan Integrasi Frontend & Mobile

### 7.1 Web Command Centre (Next.js / React)
* **Dropdown Pemilihan Site**:
  * Jika pengguna login sebagai `SUPER_ADMIN`: Sediakan opsi checkbox atau pilihan *"Semua Situs (Global Shift)"* pada formulir pembuatan shift (`siteId: null`).
  * Jika pengguna login sebagai `ADMIN`: Sembunyikan opsi Global Shift. Form pembuatan shift harus otomatis menetapkan `siteId` dari situs yang dikelola atau mewajibkan admin memilih dari situs otoritasnya.
* **Tindakan Edit & Hapus (Edit & Delete Actions)**:
  * Sembunyikan atau *disable* tombol **Edit** dan **Hapus** pada tabel shift jika baris tersebut adalah Global Shift (`siteId === null`) dan user saat ini bukan `SUPER_ADMIN`.
  * Sembunyikan atau *disable* tombol **Edit** dan **Hapus** pada shift atau susunan roster milik situs yang bukan berada dalam otoritas admin login.
  * Berikan indikator / badge *"Sedang Digunakan"* pada shift yang terikat penugasan atau riwayat absensi. Nonaktifkan (*disable*) tombol Edit dan Hapus, atau tampilkan modal peringatan: *"Shift ini sedang digunakan oleh petugas/roster aktif atau memiliki riwayat absensi. Alihkan penugasan petugas terlebih dahulu sebelum mengubah atau menghapus shift ini."*

### 7.2 Mobile Flutter App
* Saat mengambil daftar shift untuk fitur tukar shift atau izin dinas:
  * Panggil `GET /shifts?siteId=<user_active_site_id>`. API secara otomatis sudah menggabungkan seluruh shift spesifik site tersebut dengan shift global terpusat.
* Tampilan visual shift global dapat diberi badge penanda kecil seperti `[Global]` atau `[Pusat]` agar petugas atau supervisor dapat membedakannya dari shift lokal site.
