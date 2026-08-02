# Kesiapan Rilis — Herbaspace POS (2 Agustus 2026)

Verifikasi ulang terhadap **kode saat ini** (bukan audit lama). Metode: typecheck +
build + 3 agen telaah paralel membaca kode langsung. Semua verdict punya bukti
`file:line`. Kabar baik: mayoritas temuan kritis audit 28 Juli **sudah benar-benar
diperbaiki** di commit fitur belakangan. Sisa blocker jauh lebih sedikit.

## Verdict: **BELUM siap rilis penuh — tapi dekat.**

- **Web (Vercel):** bisa rilis setelah menutup 2 blocker uang/PII di bawah.
- **APK Android:** BELUM — cetak struk, scan barcode, dan export semua mati diam-diam
  di WebView. Untuk POS ritel ini fatal.

Sehat: `tsc --noEmit` lulus bersih. Secrets bersih (`.env` di-gitignore, tak ada rahasia
ter-commit). Semua fix sudah di-commit (git status bersih).

---

## 🔴 Blocker rilis (tutup dulu)

**R1. Diskon tidak divalidasi di server — sale bisa di-nol-kan. → DITERIMA SEBAGAI RISIKO (2 Agu 2026).**
`create_sale` menerima `p_discount` mentah (`db/functions.sql`), `api/_handlers/sales.ts:48`
hanya clamp `[0, subtotal]`. Diskon manual di POS memang fitur bebas (Rp/%, tanpa role
gate). Karena klien hanya mengirim SATU angka `discount` gabungan (promo+manual) dan
manual tak dibatasi, "validasi promo di server" = no-op: request rekayasa cukup melabeli
semuanya "manual". Menutupnya butuh cap/role-gate pada bagian manual.
**Keputusan owner: biarkan** — toko owner-operated, siapa pun ber-token bisa diskon s/d
100%. Tak ada perubahan kode. Upgrade path bila dibutuhkan: cap diskon-% dengan bypass
owner, atau gate diskon manual ke manajer/owner.

**R2a. Cetak struk thermal di APK → DIKERJAKAN (2 Agu 2026), perlu test hardware.**
Plugin `bluetooth-serial` (Capacitor-native, Bluetooth Classic SPP) + patch-package
(`namespace` untuk AGP 8). `thermal-printer.ts` dapat transport native: pilih printer
bonded, connect, tulis byte ESC/POS. `encode()` ASCII-fold (byte-exact lewat transport
UTF-8 + anti-mojibake). Hook `useThermalPrint` + picker printer, dipakai di POS success
& detail transaksi. Manifest: BLUETOOTH_CONNECT dll. Build APK lulus. **BELUM diuji di
printer RPP02/C-58BT asli** — tim wajib test-print (pairing → izin → pilih printer → cetak).
Scan barcode & export CSV/PDF **masih** butuh native plugin (belum dikerjakan).

**R2 (asli). APK: cetak struk, scan barcode, export CSV/PDF mati diam-diam.**
App hanya pakai `@capacitor/core` (0 native plugin). `Capacitor.isNativePlatform()` cuma
dipakai untuk unregister SW (`src/main.tsx:9`), tak mem-gate fitur.
- Cetak "Struk": `window.open` → null di WebView → tak cetak (`src/lib/receipt.ts:32`),
  dipanggil `pos/index.tsx:553`, `transactions/detail.tsx:39`.
- Scan barcode: `BarcodeDetector` + `getUserMedia`, **CAMERA tak ada di
  AndroidManifest** (`android/app/src/main/AndroidManifest.xml` hanya INTERNET).
- Export CSV (`a.download`) & PDF (`window.open`+print) → tak ada file
  (`src/lib/export.ts:40,83`).
**Fix:** native plugin (ML Kit barcode + izin CAMERA, `@capacitor/filesystem`+share untuk
export, plugin ESC/POS untuk cetak) **ATAU** rilis sebagai web-app dulu dan tandai APK
"beta". WA share **sudah diperbaiki** (`publicBaseUrl()` hindari localhost).

**R3 (operasional). Deploy DB produksi.** Memory proyek menandai prod pernah drift
(`create_sale` versi lama → semua sale 500). Pastikan `db/functions.sql` terbaru +
migrasi `0004`–`0008` sudah ter-apply di DB produksi sebelum rilis. Tak bisa diverifikasi
dari repo — **cek manual wajib.**

---

## 🟠 Tinggi (idealnya sebelum rilis)

**R4. Link struk publik membocorkan PII. → SUDAH DIPERBAIKI (2 Agu 2026).**
Payload publik `share-receipt.ts` kini TIDAK lagi mengembalikan `customer.name` maupun
`cashier.fullName` (dihapus dari query `with` & respons). `payments` (metode+jumlah)
tetap — itu isi struk standar dan sama dengan total. Frontend `shared-receipt.tsx`
menandai kedua field opsional (render sudah ber-guard `&&`). tsc lulus.

**R5. Laporan understate omzet / overstate laba di periode ramai.**
`reports/index.tsx:38` cap 1000 transaksi, pengeluaran default 100
(`expenses.ts:28`), semua agregasi di klien. Periode Bulanan/Tahunan yang ramai →
angka uang diam-diam salah. **Fix nyata:** SUM/GROUP BY di server, bukan naikkan cap.

---

## 🟡 Sedang (bisa fast-follow pasca-rilis)

- **R6. Promo PUT/DELETE lintas-outlet.** `promos.ts:52,62` hanya scope `tenantId` →
  manager bisa edit/hapus promo outlet lain. Tambah `outletFilter`.
- **R7. Poison message antre selamanya.** `offline-sync.ts:64-66` perlakukan 401/403 &
  semua 5xx sebagai transient, retry tiap siklus tanpa cap, tak di-eskalasi ke state
  "gagal". (400/404/422 sudah ditangani → `moveToFailed`.) Tambah cap attempt + surface.
- **R8. Shift null-outlet legacy sum se-tenant saat close.** Pembuatan shift null-outlet
  sudah diblok (`shifts.ts:38`), tapi close-site (`:101,115`) masih tanpa filter outlet
  untuk row lama yang `outletId` null. Cek data lama; kalau ada, backfill.
- **R9. Manager tanpa outlet bisa void lintas-outlet.** Guard `transactions.ts:44`
  di-skip saat `auth.outletId` null. Edge case; pastikan manager selalu ber-outlet.

---

## ⚪ Rendah / kebersihan

- **R10. `npm run lint` rusak** — tak ada `eslint.config.js` (ESLint 9 wajib flat config).
  Linting tak pernah jalan. Tambah config minimal.
- Isolasi tenant **hanya di lapisan app** (RLS = no-op, koneksi service-role) — keputusan
  arsitektur tercatat. Satu handler lupa filter `tenantId` = kebocoran instan. Tak ada
  backstop DB. Terima risiko atau tambah RLS + sesi per-request (besar).

---

## Fitur yang MEMANG belum ada (keputusan produk, bukan bug)

Refund (hanya void), split payment, kasbon/piutang, tukar poin (poin numpuk tak bisa
dipakai). Bukan blocker teknis — putuskan apakah retail parfum butuh saat rilis.

---

## Sudah diverifikasi BENAR di kode saat ini (temuan audit lama yang kini FIXED)

C1 (no fake offline success), C2 (outlet attribution capture-time), C3 (logout tak buang
antrean pending), C5 (guard last-owner + validasi role), H1 (varian optionId tak orphan
lagi), H4 (antre saat fetch gagal, bukan cuma offline flag), H5 (unit bahan dikunci),
H6 (stock adjust atomik), H7 (catatan item tersimpan end-to-end), H10 (kasir tak bisa
tutup shift orang lain), M1 (cache persist), M2 (/me retry backoff), M5 (clear field
tersimpan), M6 (parse "10.000"), M11 (X-Outlet-Id divalidasi milik tenant), **B1 stok
barang jadi** (potong saat jual, kembali saat void, atomik, simetris).
