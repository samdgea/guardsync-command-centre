# GuardSync Command Centre — Design Direction

## 1. Identity & Mood
- **Product**: GuardSync Command Centre (Web Monitoring & Field Security Operations)
- **Target Audience**: `SUPER_ADMIN` dan `ADMIN` (Koordinator keamanan operasional, pengawas pos, ruang kontrol)
- **Mood**: Profesional, utiliter, tajam, terorganisir, andal, high-contrast, responsif
- **Aesthetic**: Slate & Deep Navy operational console, status badge yang tegas, tipografi bersih dengan keterbacaan tinggi dalam kondisi pencahayaan ruang kontrol.

## 2. Dials (Antislop)
- **ENERGY**: 2 (Balanced — percaya diri, tegas, tidak hiperaktif/gimmick)
- **RHYTHM**: 2 (Consistent dengan hierarki fungsional: KPI cards, interactive table, map visualizer, audit modals)
- **MOTION**: 1 (Utilitarian — transisi hover halus, sheet/modal slide cepat tanpa animasi lambat yang menghambat kerja operator)

## 3. Color Palette & WCAG AA Contrast
- **Base Background**: 
  - Light mode: `#f8fafc` (Slate 50) dengan surface `#ffffff` (White)
  - Dark mode: `#0b0f19` (Deep Navy / Slate 950) dengan surface `#111827` (Slate 900)
- **Borders & Dividers**: Slate 200 / Slate 800
- **Primary / Action**: Deep Indigo / Slate Navy (`#1e293b` / `#0f172a` dengan accent `#2563eb` Blue 600 untuk link/action utama)
- **Status Semantic Colors**:
  - `AMAN` / Aktif / Success: Green (`#16a34a` / `#15803d`, background `#dcfce7` light / `#14532d` dark)
  - `WASPADA` / Warning: Amber/Yellow (`#d97706` / `#b45309`, background `#fef3c7` light / `#78350f` dark)
  - `DARURAT` / Danger / Error: Rose/Red (`#dc2626` / `#b91c1c`, background `#fee2e2` light / `#7f1d1d` dark)
  - `PENDING` / Inactive / Muted: Slate (`#64748b`, background `#f1f5f9` light / `#1e293b` dark)
  - Kontras teks selalu memenuhi minimum rasio WCAG AA (4.5:1 untuk body text, 3:1 untuk large text).

## 4. Typography
- **Font Family**: Inter, system-ui, -apple-system, sans-serif
- **Heading**: Inter SemiBold / Bold, hierarchy yang proporsional, tanpa uppercase berlebih
- **Body & Data**: Inter Regular / Medium, tabular nums (`font-mono` atau `tabular-nums`) untuk angka koordinat, NIK, kode checkpoint, jam patroli

## 5. Komponen & Spacing
- **Border Radius**: Konsisten `rounded-lg` (8px) untuk card dan modal, `rounded-md` (6px) untuk tombol dan input. Tidak menggunakan full-pill untuk card/modal.
- **Elevation / Shadow**: Subtle (`shadow-sm` hingga `shadow-md` untuk modal/popover), bukan shadow floating berlebih.
- **Responsiveness**: Support viewport tablet (1024px) hingga ultra-wide desktop console (1920px+), dengan tata letak adaptif untuk mobile review (min tap target 44px).
