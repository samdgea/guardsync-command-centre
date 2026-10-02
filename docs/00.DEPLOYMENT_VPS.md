# Panduan Deployment Frontend GuardSync ke VPS via GitHub Actions

CI/CD ini dikonfigurasi menggunakan metode **Build Standalone di GitHub Actions Runner** lalu mengirimkan bundle artifact yang sudah jadi ke VPS.

### Keuntungan Metode Ini:
- **Hemat RAM/CPU VPS**: VPS tidak perlu menjalankan `pnpm install` dan `next build` yang memakan RAM besar (mencegah VPS 1GB/2GB crash karena Out Of Memory / OOM).
- **Bundle Sangat Ringan**: Next.js `output: 'standalone'` hanya memaketkan dependensi yang dibutuhkan (~25MB terkompresi ~10MB).
- **Zero-Downtime Reload**: PM2 melakukan reload proses tanpa memutus koneksi pengguna.

---

## 1. Persiapan di VPS

Pastikan di VPS Anda sudah terpasang Node.js (v18 atau v20) dan Nginx.

### A. Install Node.js & PM2 (jika belum ada)
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 secara global
sudo npm install -g pm2

# Setup PM2 agar otomatis jalan saat VPS reboot
pm2 startup
# (Jalankan perintah sudo env PATH... yang muncul di terminal)
```

### B. Siapkan Folder Aplikasi
```bash
sudo mkdir -p /var/www/guardsync-fe
sudo chown -R $USER:$USER /var/www/guardsync-fe
```

### C. Konfigurasi Nginx Reverse Proxy
Buat file konfigurasi Nginx, misalnya `/etc/nginx/sites-available/guardsync-fe`:

```nginx
server {
    listen 80;
    server_name dashboard.example.com; # Ganti dengan domain/subdomain Anda atau IP VPS

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi dan reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/guardsync-fe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
*(Opsional: Pasang SSL menggunakan `sudo certbot --nginx -d dashboard.example.com`)*

---

## 2. Setup GitHub Repository Secrets

Buka repositori GitHub Anda: **Settings** > **Secrets and variables** > **Actions** > Klik **New repository secret**.

Tambahkan secret berikut:

| Nama Secret | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- |
| `VPS_HOST` | IP Address atau domain VPS | `103.123.45.67` |
| `VPS_USERNAME` | Username login SSH VPS | `ubuntu` atau `root` |
| `VPS_SSH_KEY` | Private SSH Key (format OpenSSH / PEM) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `VPS_PASSWORD` | *(Opsional)* Password SSH jika tidak pakai SSH Key | `PasswordVPS123!` |
| `VPS_PORT` | Port SSH (default: 22) | `22` |
| `VPS_TARGET_DIR` | Folder tujuan di VPS | `/var/www/guardsync-fe` |
| `NEXT_PUBLIC_API_URL` | URL API Backend GuardSync | `https://be.guardsync-dev.syntherion.co.id` |

> [!TIP]
> **Cara membuat SSH Key untuk GitHub Actions:**
> 1. Di komputer lokal atau VPS, jalankan:
>    ```bash
>    ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy
>    ```
> 2. Salin isi public key (`github_deploy.pub`) ke `~/.ssh/authorized_keys` di VPS.
> 3. Salin isi private key (`github_deploy`) ke GitHub Secret `VPS_SSH_KEY`.

---

## 3. Cara Kerja CI/CD

1. **Trigger Otomatis**: Setiap kali ada `git push` ke branch `main`, GitHub Actions akan otomatis berjalan.
2. **Trigger Manual**: Anda juga dapat menjalankannya manual via tab **Actions** > **Deploy Frontend to VPS** > **Run workflow**.
3. **Proses Build**:
   - Kode ditarik dan di-build menggunakan `pnpm build` dengan mode `standalone`.
   - File statis (`.next/static` & `public`) digabungkan ke paket standalone bersama konfigurasi PM2 (`ecosystem.config.cjs`).
   - Semua file dikompresi menjadi `deploy.tar.gz`.
4. **Proses Deploy**:
   - File arsip diunggah ke VPS via SCP.
   - Script SSH mengekstrak file ke `VPS_TARGET_DIR`.
   - PM2 me-reload aplikasi dengan `pm2 startOrReload ecosystem.config.cjs --env production`.
