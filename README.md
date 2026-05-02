# 🤖 Auto Seller — Digiflazz

Script browser automation untuk memilih seller terbaik secara otomatis di platform [Digiflazz](https://member.digiflazz.com), sekaligus mengisi harga maksimal berdasarkan harga seller yang terpasang.

---

## ✨ Fitur

- **Auto pilih seller terbaik** berdasarkan harga termurah + rating tertinggi
- **Filter rating & review** — hanya pilih seller dengan rating dan jumlah review minimal
- **Filter blacklist seller** — skip seller tertentu berdasarkan nama
- **Auto ubah page size** halaman utama ke 100/page agar semua produk tampil sekaligus
- **Auto pagination popup** — kumpulkan seller dari semua halaman popup
- **Isi harga maksimal otomatis** = harga seller real yang terpasang + margin %
- **Anti-logout** — tidak menyentuh tombol yang mengandung kata berbahaya (logout, keluar, dll)
- **Debug lengkap** via `console.table` untuk memonitor setiap keputusan

---

## ⚙️ Konfigurasi

Semua pengaturan ada di bagian `CONFIG` di atas file:

```js
const CONFIG = {
  aktif: true,                          // Aktifkan/nonaktifkan script
  maksimalProdukDiproses: 999,          // Batas maksimal produk yang diproses per sesi
  targetProduk: [],                     // (opsional) daftar nama produk yang mau diproses saja
  wajibStatusOn: false,                 // Jika true, hanya pilih seller dengan status ON
  minRating: 4,                         // Rating minimal seller (skala 5)
  minReview: 10,                        // Jumlah review minimal seller
  izinkanTanpaRating: false,            // Jika true, seller tanpa rating tetap diizinkan
  maxSelisihHarga: 2000,               // Selisih harga maksimal dari harga termurah (Rp)
  jedaAntarProdukMs: 800,              // Jeda antar produk dalam milidetik
  blacklistSeller: [                    // Nama seller yang selalu di-skip
    "seller jelek",
    "seller bermasalah"
  ],

  isiHargaMaksimal: true,              // Aktifkan pengisian kolom Harga Max otomatis
  marginHargaPersen: 2,                // Margin harga maksimal di atas harga seller (%)

  pageSizeHalamanUtama: "100/page",    // Page size yang diset di halaman produk utama

  forbiddenKeywords: [                 // Kata-kata yang membuat tombol/elemen di-skip
    "logout", "keluar", "sign out", "akun saya", "profil"
  ]
};
```

### Penjelasan parameter penting

| Parameter | Default | Keterangan |
|---|---|---|
| `minRating` | `4` | Seller dengan rating di bawah ini akan di-skip |
| `minReview` | `10` | Seller dengan review di bawah ini akan di-skip |
| `maxSelisihHarga` | `2000` | Seller yang harganya lebih mahal >Rp 2.000 dari termurah akan di-skip |
| `marginHargaPersen` | `2` | Harga Max = harga seller terpasang × 1.02 |
| `wajibStatusOn` | `false` | Set `true` jika hanya mau seller yang statusnya ON |
| `maksimalProdukDiproses` | `999` | Kurangi jika hanya mau proses sebagian produk |

---

## 🚀 Cara Penggunaan

### 1. Buka Halaman Produk Digiflazz

Masuk ke akun Digiflazz → **Produk** → **Prabayar** → pilih kategori yang diinginkan (contoh: Mobile Legends, Telkomsel, dll).

### 2. Buka Developer Tools

Tekan `F12` atau `Ctrl+Shift+I` → pilih tab **Console**.

### 3. Paste Script

Copy seluruh isi file `auto-seller-v2.js`, paste ke console, tekan **Enter**.

Akan muncul konfirmasi:
```
[Auto Seller] FILE AMAN TERLOAD - VERSI ANTI-LOGOUT + AUTO PAGE SIZE
✅ Anti-Logout + Auto Page Size Aktif.
▶ Jalankan dengan: document.dispatchEvent(new CustomEvent('AUTO_SELLER_MULAI'))
```

### 4. Jalankan Script

```js
document.dispatchEvent(new CustomEvent('AUTO_SELLER_MULAI'))
```

Script akan berjalan otomatis dari produk pertama hingga terakhir.

---

## 🔄 Alur Kerja Script

```
Mulai
  │
  ├─ 1. Baca total produk dari pagination
  ├─ 2. Ubah page size halaman utama → 100/page
  ├─ 3. Tunggu semua produk termuat
  │
  └─ Untuk setiap produk:
       │
       ├─ Klik "Ubah Seller"
       ├─ Set filter: page size 100/page, rating minimal, review 10+
       ├─ Kumpulkan semua seller dari semua halaman popup
       ├─ Filter seller (harga, rating, review, status, blacklist)
       ├─ Pilih seller terbaik (termurah → rating tertinggi)
       ├─ Klik "Pilih" seller terpilih
       ├─ Baca harga seller REAL yang terpasang di halaman utama
       └─ Isi kolom Harga Max = harga real + margin %
```

---

## 🧠 Logika Pemilihan Seller

1. Kumpulkan semua seller dari popup (semua halaman)
2. Temukan harga termurah (`hargaMin`)
3. Filter seller yang memenuhi **semua** kriteria berikut:
   - Selisih harga ≤ `maxSelisihHarga` dari `hargaMin`
   - Rating ≥ `minRating`
   - Jumlah review ≥ `minReview`
   - Status ON (jika `wajibStatusOn: true`)
   - Nama tidak ada di `blacklistSeller`
   - Ada tombol "Pilih" yang bisa diklik
4. Dari seller yang lolos, pilih yang **harga termurah** — jika sama, pilih **rating tertinggi**

---

## 💰 Logika Harga Maksimal

Harga maksimal **tidak dihitung dari harga seller di popup**, melainkan dari **harga seller yang benar-benar terpasang** di kolom "Harga" halaman utama setelah seller dipilih.

Ini penting karena sistem Digiflazz kadang otomatis mengganti ke seller lain jika seller pilihan script tidak tersedia.

```
Harga Max = round(harga_real_terpasang × (1 + marginHargaPersen/100))

Contoh: harga terpasang Rp 1.452, margin 2%
→ Harga Max = round(1452 × 1.02) = Rp 1.481
```

---

## 📋 Format Rating yang Didukung

Script dapat membaca berbagai format rating dari popup seller Digiflazz:

| Format | Rating | Review |
|---|---|---|
| `4.57 (10+ rating)` | 4.57 | 10 |
| `2.48 (60+ rating)` | 2.48 | 60 |
| `4.43 (<10 rating)` | 4.43 | 9 |
| `4.95 (20+ rating)` | 4.95 | 20 |

---

## 🐛 Troubleshooting

### Script tidak menemukan produk
- Pastikan halaman sudah dimuat penuh
- Pastikan ada tombol "Ubah Seller" yang terlihat di tabel
- Coba scroll ke bawah dulu agar tabel ter-render

### Seller tidak ditemukan di popup
- Pastikan popup "Ubah Seller" sudah terbuka sebelum script mengekstrak seller
- Cek console apakah ada pesan `PERINGATAN: Dialog popup tidak ditemukan`
- Coba tambah `jedaAntarProdukMs` ke `1200` atau lebih

### Harga maksimal tidak terisi
- Cek console untuk pesan `Input ditemukan di row: N` — pastikan index `[1]` adalah kolom Harga Max
- Jika kolom berbeda urutannya, sesuaikan index di baris `const inputHarga = semuaInput[1]`

### Semua seller gagal filter
- Cek `minRating` dan `minReview` — coba turunkan nilainya
- Atau set `izinkanTanpaRating: true` untuk produk yang sellernya sedikit
- Lihat `console.table` untuk detail kenapa seller di-filter

---

## 📁 Struktur File

```
auto-seller-v2.js   ← Script utama
README.md           ← Dokumentasi ini
```

---

## ⚠️ Disclaimer

Script ini dibuat untuk keperluan pribadi/efisiensi operasional. Gunakan dengan bijak dan sesuai ketentuan platform Digiflazz. Penulis tidak bertanggung jawab atas penyalahgunaan script ini.

---

## 📝 Changelog

### v2 (Latest)
- Fix: ekstrak seller sekarang dibatasi dalam popup saja (sebelumnya membaca tabel halaman utama)
- Fix: harga maksimal dihitung dari harga seller **real yang terpasang**, bukan dari harga di popup
- Fix: pencarian row produk menggunakan kode produk (lebih unik) sebagai primary key
- Fix: `parseHarga` menangani format `Rp 5.175` (titik sebagai pemisah ribuan)
- Fix: `parseRating` dan `parseReview` mendukung format `(<10 rating)`
- Tambah: auto ubah page size halaman utama ke 100/page
- Tambah: pagination popup dibatasi dalam dialog saja
- Tambah: verifikasi harga setelah diisi (warning jika nilai < harga seller)
- Tambah: debug log lengkap untuk setiap input yang ditemukan di row

### v1
- Versi awal dengan fitur dasar auto pilih seller dan isi harga maksimal
