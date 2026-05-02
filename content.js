console.log("[Auto Seller] FILE AMAN TERLOAD - VERSI ANTI-LOGOUT + AUTO PAGE SIZE");

(function () {
  const CONFIG = {
    aktif: true,
    maksimalProdukDiproses: 999,
    targetProduk: [],
    wajibStatusOn: false,
    minRating: 4,
    minReview: 10,
    izinkanTanpaRating: false,
    maxSelisihHarga: 2000,
    jedaAntarProdukMs: 800,
    blacklistSeller: ["seller jelek", "seller bermasalah"],

    isiHargaMaksimal: true,
    marginHargaPersen: 2,

    // Page size yang diinginkan di halaman utama produk
    pageSizeHalamanUtama: "100/page",

    forbiddenKeywords: ["logout", "keluar", "sign out", "akun saya", "profil"]
  };

  let sedangBerjalan = false;

  function log(...args) {
    console.log("[Auto Seller]", ...args);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function normalisasi(text) {
    return String(text || "").trim().toLowerCase();
  }

  function isForbidden(text) {
    const t = normalisasi(text);
    return CONFIG.forbiddenKeywords.some(word => t.includes(word));
  }

  function parseHarga(text) {
    if (!text) return Infinity;
    // Format: "Rp 5.175" atau "Rp5175" - titik adalah pemisah ribuan
    const match = String(text).match(/Rp\s?([\d.]+)/i);
    if (!match) return Infinity;
    // Hapus titik pemisah ribuan lalu konversi ke angka
    const angka = match[1].replace(/\./g, "");
    const hasil = Number(angka);
    // Sanity check: harga valid minimal Rp 100
    return (hasil >= 100) ? hasil : Infinity;
  }

  function parseRating(text) {
    if (!text) return 0;
    const sumber = String(text).replace(",", ".");
    // Format utama: "4.57 (10+ rating)" — angka sebelum kurung adalah rating
    const polaUtama = sumber.match(/(\d+(?:\.\d+)?)\s*\(\s*(?:<\s*)?\d+\+?\s*(?:rating|review|ulasan)/i);
    if (polaUtama) return Number(polaUtama[1]);
    const pola = [
      /rating\s*:?\s*(\d+(?:\.\d+)?)/i,
      /rate\s*:?\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*\/\s*5/i,
      /⭐\s*(\d+(?:\.\d+)?)/i,
    ];
    for (const p of pola) {
      const m = sumber.match(p);
      if (m) return Number(m[1]);
    }
    return 0;
  }

  function parseReview(text) {
    if (!text) return 0;
    const s = String(text);
    // Format: "4.57 (10+ rating)" atau "2.48 (60+ rating)" atau "(<10 rating)"
    const formatPlus = s.match(/\(\s*(\d+)\+\s*(?:rating|review|ulasan|penilaian)\s*\)/i);
    if (formatPlus) return Number(formatPlus[1]);
    // Format: "(<10 rating)" → kurang dari 10, anggap 9
    if (/\(<\s*10\s*(?:rating|review|ulasan)/i.test(s)) return 9;
    if (/(?:<|kurang dari)\s*10\s*(?:rating|review|ulasan)/i.test(s)) return 9;
    const pola = [
      /\(\s*(\d+)\+?\s*(?:rating|review|ulasan|penilaian)\s*\)/i,
      /(\d+)\+?\s*(?:review|ulasan|penilaian|rating)/i,
      /dari\s*(\d+)/i,
    ];
    for (const p of pola) {
      const m = s.match(p);
      if (m) return Number(m[1]);
    }
    return 0;
  }

  function cariTombolAman(root, keyword) {
    const kandidat = Array.from(root.querySelectorAll("button, a, [role='button']"));
    return kandidat.find(el => {
      const text = el.innerText || el.textContent || "";
      return normalisasi(text).includes(normalisasi(keyword)) && !isForbidden(text);
    });
  }

  // ============================================================
  // BARU: Ubah page size di halaman utama (luar popup)
  // ============================================================
  async function ubahPageSizeHalamanUtama(targetSize) {
    log(`Mencoba ubah page size halaman utama ke: ${targetSize}`);

    // Cari semua .el-select di LUAR dialog/modal
    const semuaSelect = Array.from(document.querySelectorAll(".el-select")).filter(el => {
      const dialog = el.closest(".el-dialog");
      return !dialog; // hanya yang di luar popup
    });

    log(`Ditemukan ${semuaSelect.length} el-select di halaman utama`);

    // Cari select yang valuenya mirip page size (berisi "/page" atau angka per halaman)
    let selectPageSize = null;
    for (const sel of semuaSelect) {
      const inputEl = sel.querySelector("input");
      const val = inputEl ? (inputEl.value || inputEl.placeholder || "") : "";
      const labelEl = sel.querySelector(".el-input__inner, .el-select__caret");
      const labelText = sel.innerText || "";
      if (/\d+\s*\/\s*page/i.test(val) || /\d+\s*\/\s*page/i.test(labelText)) {
        selectPageSize = sel;
        log(`Select page size ditemukan dengan value: "${val || labelText}"`);
        break;
      }
    }

    // Fallback: coba select terakhir di halaman utama
    if (!selectPageSize && semuaSelect.length > 0) {
      selectPageSize = semuaSelect[semuaSelect.length - 1];
      log("Fallback: menggunakan el-select terakhir di halaman utama.");
    }

    if (!selectPageSize) {
      log("GAGAL: Select page size tidak ditemukan di halaman utama.");
      return false;
    }

    // Klik untuk buka dropdown
    const inputEl = selectPageSize.querySelector("input") || selectPageSize;
    inputEl.click();
    await delay(500);

    // Cari opsi yang cocok
    const opsiList = Array.from(document.querySelectorAll(
      ".el-select-dropdown__item, .el-dropdown-menu__item"
    ));

    log(`Opsi dropdown ditemukan: ${opsiList.length}`);
    opsiList.forEach(o => log(`  → "${o.innerText.trim()}"`));

    const opsiTarget = opsiList.find(el =>
      normalisasi(el.innerText).includes(normalisasi(targetSize))
    );

    if (opsiTarget) {
      opsiTarget.click();
      log(`Page size halaman utama berhasil diset ke: ${targetSize}`);
      await delay(1200); // Tunggu tabel reload
      return true;
    }

    log(`Opsi "${targetSize}" tidak ditemukan, menutup dropdown.`);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await delay(300);
    return false;
  }

  // ============================================================
  // BARU: Tunggu hingga semua produk termuat setelah page size diubah
  // ============================================================
  async function tunggуProdukTermuat(jumlahMinimal, maxRetry = 10) {
    for (let i = 0; i < maxRetry; i++) {
      await delay(600);
      const produk = cariSemuaRowProduk();
      if (produk.length >= jumlahMinimal) {
        log(`Produk termuat: ${produk.length} (target minimal: ${jumlahMinimal})`);
        return produk;
      }
      log(`Menunggu produk termuat... (${i + 1}/${maxRetry}) saat ini: ${produk.length}`);
    }
    return cariSemuaRowProduk();
  }

  // ============================================================
  // BARU: Baca total produk dari teks pagination halaman utama
  // ============================================================
  function bacaTotalProdukDariPagination() {
    const paginationEl = document.querySelector(".el-pagination");
    if (!paginationEl) return 0;
    const text = paginationEl.innerText || "";
    const match = text.match(/Total\s+(\d+)/i);
    if (match) {
      log(`Total produk dari pagination: ${match[1]}`);
      return Number(match[1]);
    }
    return 0;
  }

  function cariSemuaRowProduk() {
    const baris = Array.from(document.querySelectorAll("tr, .row, .card-body"));
    const produkRows = baris.map(el => {
      const text = el.innerText || "";
      if (!normalisasi(text).includes("ubah seller") || !/Rp\s?[\d.]+/i.test(text) || isForbidden(text)) {
        return null;
      }

      // Ambil kode produk dari input pertama (lebih unik & stabil untuk pencarian row)
      const inputKode = el.querySelector("input[placeholder*='Kode'], input[placeholder*='kode']")
        || el.querySelectorAll("input")[0];
      const kodeProduk = inputKode ? inputKode.value.trim() : "";

      const lines = text.split("\n").map(x => x.trim()).filter(Boolean);
      const namaProduk = lines[0] || "Produk";

      return { row: el, namaProduk, kodeProduk };
    }).filter(Boolean);

    log("Produk aman ditemukan:", produkRows.length);
    return produkRows;
  }

  async function klikOpsiSelect(selectEl, nilaiTarget) {
    const input = selectEl.querySelector("input") || selectEl;
    input.click();
    await delay(400);

    const opsi = Array.from(document.querySelectorAll(".el-select-dropdown__item"))
      .find(el => normalisasi(el.innerText).includes(normalisasi(nilaiTarget)));

    if (opsi) {
      opsi.click();
      log(`Select diset ke: ${nilaiTarget}`);
      await delay(500);
      return true;
    }

    log(`Opsi "${nilaiTarget}" tidak ditemukan.`);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    return false;
  }

  async function isiFilterRating() {
    const dialog = document.querySelector(".el-dialog.is-fullscreen");
    if (!dialog) return;

    const selects = dialog.querySelectorAll(".el-select");

    // 1. Set page size ke 100/page agar semua seller muat 1 halaman
    if (selects[4]) {
      await klikOpsiSelect(selects[4], "100/page");
      await delay(600);
    }

    // 2. Set Rating Minimal (input teks)
    const inputRating = dialog.querySelector("input[placeholder*='Contoh'], input[placeholder*='contoh']");
    if (inputRating) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(inputRating, String(CONFIG.minRating));
      } else {
        inputRating.value = String(CONFIG.minRating);
      }
      inputRating.dispatchEvent(new Event('input', { bubbles: true }));
      inputRating.dispatchEvent(new Event('change', { bubbles: true }));
      inputRating.dispatchEvent(new Event('blur', { bubbles: true }));
      log(`Filter Rating Minimal diisi: ${CONFIG.minRating}`);
      await delay(600);
    } else {
      log("Input Rating Minimal tidak ditemukan, skip.");
    }

    // 3. Set Rating Qty ke 10+
    if (selects[3]) {
      await klikOpsiSelect(selects[3], "10+");
      await delay(600);
    }
  }

  function ekstrakSellerDariPopup() {
    // Seller di popup pakai <tr> biasa (tanpa class el-table__row)
    // Harus dibatasi dalam container popup "el-dialog is-fullscreen"
    const dialog = document.querySelector(".el-dialog.is-fullscreen, .el-dialog__body");
    if (!dialog) {
      log("PERINGATAN: Dialog popup tidak ditemukan untuk ekstrak seller!");
      return [];
    }
    const rows = Array.from(dialog.querySelectorAll("tr"));

    const sellers = rows.map(row => {
      const text = row.innerText || "";

      // Skip baris header tabel
      if (row.closest("thead") || row.querySelector("th")) return null;
      // Harus ada harga Rp
      if (!/Rp\s?[\d.]+/i.test(text)) return null;
      if (isForbidden(text)) return null;
      // Harus ada format rating "(10+ rating)" atau "(<10 rating)"
      if (!/\((?:<\s*)?\d+\+?\s*(?:rating|review|ulasan)\s*\)/i.test(text)) return null;
      if (text.length > 1500) return null;

      const harga = parseHarga(text);
      if (harga === Infinity || harga < 100) return null;

      const rating = parseRating(text);
      const reviewCount = parseReview(text);
      const statusOn = /\bON\b/i.test(text) || /aktif/i.test(text) || /normal/i.test(text);
      const statusOff = /\bOFF\b/i.test(text) || /gangguan/i.test(text) || /tutup/i.test(text) || /habis/i.test(text);

      const lines = text.split("\n").map(x => x.trim()).filter(Boolean);
      const nama = lines.find(l =>
        l.length > 4 &&
        !/^[A-Z]{1,8}\d*$/.test(l) &&
        !/^(ip|api|jabber)$/i.test(l) &&
        !/Rp/i.test(l) &&
        !/\d+:\d+/.test(l) &&
        !/rating|review|\(\d/i.test(l) &&
        !/^(ya|tidak|on|off|unlimited)$/i.test(l)
      ) || "Unknown";

      if (nama === "Unknown") return null;

      const tombolPilih = cariTombolAman(row, "pilih") || row.querySelector("button, [role='button']") || row;

      return { row, nama, harga, rating, reviewCount, statusOn, statusOff, tombolPilih };
    }).filter(s => s && s.harga !== Infinity && s.harga > 0);

    const uniqueSellers = sellers.filter(s =>
      !sellers.some(other => other !== s && s.row.contains(other.row))
    );

    const seen = new Set();
    const dedupSellers = uniqueSellers.filter(s => {
      const key = `${s.harga}-${s.nama}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return dedupSellers;
  }

  function pilihSellerTerbaik(sellers) {
    log("Jumlah seller terbaca:", sellers ? sellers.length : 0);

    if (!sellers || !sellers.length) {
      console.warn("[Auto Seller] Tidak ada seller terbaca dari popup.");
      return null;
    }

    const hargaMin = Math.min(...sellers.map(s => s.harga));
    log("Harga minimum:", hargaMin);

    const hasilDebug = sellers.map(s => {
      const lolosHarga = (s.harga - hargaMin) <= CONFIG.maxSelisihHarga;
      const lolosRating = CONFIG.izinkanTanpaRating
        ? true
        : (s.rating >= CONFIG.minRating && s.reviewCount >= CONFIG.minReview);
      const lolosStatus = CONFIG.wajibStatusOn
        ? (s.statusOn && !s.statusOff)
        : true;
      return {
        nama: s.nama,
        harga: s.harga,
        selisih: s.harga - hargaMin,
        rating: s.rating,
        review: s.reviewCount,
        statusOn: s.statusOn,
        statusOff: s.statusOff,
        adaTombol: !!s.tombolPilih,
        lolosHarga,
        lolosRating,
        lolosStatus,
        lolosFinal: lolosHarga && lolosRating && lolosStatus && !!s.tombolPilih,
      };
    });

    console.table(hasilDebug);

    const layak = sellers.filter(s => {
      const lolosHarga = (s.harga - hargaMin) <= CONFIG.maxSelisihHarga;
      const lolosRating = CONFIG.izinkanTanpaRating
        ? true
        : (s.rating >= CONFIG.minRating && s.reviewCount >= CONFIG.minReview);
      const lolosStatus = CONFIG.wajibStatusOn
        ? (s.statusOn && !s.statusOff)
        : true;
      return lolosHarga && lolosRating && lolosStatus && !!s.tombolPilih;
    });

    if (!layak.length) {
      console.warn("[Auto Seller] Semua seller gagal filter.");
      return null;
    }

    return layak.sort((a, b) => {
      if (a.harga !== b.harga) return a.harga - b.harga;
      return b.rating - a.rating;
    })[0];
  }

  async function kumpulkanSemuaHalaman() {
    let semuaSeller = [];

    while (true) {
      await delay(600);

      const sellerHalaman = ekstrakSellerDariPopup();
      log(`Halaman: ${sellerHalaman.length} seller terbaca`);

      for (const s of sellerHalaman) {
        const key = `${s.harga}-${s.nama}`;
        if (!semuaSeller.some(x => `${x.harga}-${x.nama}` === key)) {
          semuaSeller.push(s);
        }
      }

      log(`Total terkumpul: ${semuaSeller.length}`);

      // Cari pagination DALAM popup saja
      const dialogEl = document.querySelector(".el-dialog.is-fullscreen, .el-dialog__body");
      const pagination = dialogEl
        ? dialogEl.querySelector(".el-pagination")
        : document.querySelector(".el-pagination");
      if (!pagination) {
        log("Pagination popup tidak ditemukan, selesai.");
        break;
      }

      const tombolNext = pagination.querySelector("button.btn-next");
      if (!tombolNext || tombolNext.disabled) {
        log("Halaman terakhir tercapai.");
        break;
      }

      log("Pindah ke halaman berikutnya...");
      tombolNext.click();
      await delay(800);
    }

    log(`Total seller dari semua halaman: ${semuaSeller.length}`);
    semuaSeller.forEach(s => log(`  → ${s.nama} | Rp ${s.harga} | rating: ${s.rating} | review: ${s.reviewCount}`));

    return semuaSeller;
  }

  async function prosesSatuProduk(item, index) {
    log(`[${index + 1}] Memproses: ${item.namaProduk}`);
    const btnUbah = cariTombolAman(item.row, "ubah seller");

    if (!btnUbah) {
      log("SKIP: Tombol Ubah Seller tidak ditemukan.");
      return;
    }

    btnUbah.click();
    await delay(800);

    await isiFilterRating();

    let sellers = [];
    for (let i = 0; i < 8; i++) {
      await delay(400);
      sellers = ekstrakSellerDariPopup();
      if (sellers && sellers.length > 0) break;
    }

    if (sellers && sellers.length > 0) {
      sellers = await kumpulkanSemuaHalaman();
    }

    const terbaik = pilihSellerTerbaik(sellers);

    if (terbaik && terbaik.tombolPilih) {
      log(`MEMILIH: ${terbaik.nama} | Harga: Rp ${terbaik.harga} | Rating: ${terbaik.rating}`);
      terbaik.tombolPilih.click();

      // Tunggu popup tertutup dan DOM stabil
      await delay(1200);

      if (CONFIG.isiHargaMaksimal) {
        // Cari row aktif dulu untuk baca harga seller REAL yang terpasang
        const rowTerbaru2 = cariSemuaRowProduk();
        let activeRowCek = null;
        if (item.kodeProduk) {
          const c = rowTerbaru2.find(p => p.kodeProduk === item.kodeProduk);
          if (c) activeRowCek = c.row;
        }
        if (!activeRowCek) {
          const c = rowTerbaru2.find(p => normalisasi(p.namaProduk) === normalisasi(item.namaProduk));
          if (c) activeRowCek = c.row;
        }
        if (!activeRowCek && document.contains(item.row)) activeRowCek = item.row;

        // Baca harga seller REAL dari kolom "Harga" di halaman utama
        let hargaSellerReal = terbaik.harga;
        if (activeRowCek) {
          const rowText = activeRowCek.innerText || "";
          const hargaMatch = rowText.match(/Rp\s?([\d.]+)/i);
          if (hargaMatch) {
            const hargaReal = Number(hargaMatch[1].replace(/\./g, ""));
            if (hargaReal >= 100) {
              log(`Harga seller real di halaman: Rp ${hargaReal} (sebelumnya: Rp ${terbaik.harga})`);
              hargaSellerReal = hargaReal;
            }
          }
        }

        // Harga maksimal = harga seller REAL + margin %
        const persentase = (CONFIG.marginHargaPersen / 100) * hargaSellerReal;
        const hargaSet = Math.round(hargaSellerReal + persentase);

        log(`Target harga maksimal: Rp ${hargaSet} (seller real: Rp ${hargaSellerReal} + margin ${CONFIG.marginHargaPersen}%)`);

        // Cari row aktif: utamakan cocokkan kode produk (unik), fallback ke nama produk
        let activeRow = null;

        // Selalu scan ulang DOM terbaru setelah popup tutup
        const rowTerbaru = cariSemuaRowProduk();

        if (item.kodeProduk) {
          const cocok = rowTerbaru.find(p => p.kodeProduk === item.kodeProduk);
          if (cocok) {
            activeRow = cocok.row;
            log(`Row ditemukan via kode produk: "${item.kodeProduk}"`);
          }
        }

        // Fallback: cocokkan nama produk
        if (!activeRow) {
          const cocokNama = rowTerbaru.find(p =>
            normalisasi(p.namaProduk) === normalisasi(item.namaProduk)
          );
          if (cocokNama) {
            activeRow = cocokNama.row;
            log(`Row ditemukan via nama produk: "${item.namaProduk}"`);
          }
        }

        // Last resort: pakai item.row jika masih di DOM
        if (!activeRow && document.contains(item.row)) {
          activeRow = item.row;
          log("Fallback ke item.row original.");
        }

        if (!activeRow) {
          log("GAGAL: Row produk tidak ditemukan setelah popup tutup.");
        } else {
          // Ambil semua input angka di row ini (exclude checkbox, radio, hidden)
          const semuaInput = Array.from(activeRow.querySelectorAll(
            "input[type='number'], input[type='text']:not([readonly])"
          )).filter(el =>
            !el.closest("[aria-hidden='true']") &&
            el.offsetParent !== null // hanya yang visible
          );

          log(`Input ditemukan di row: ${semuaInput.length}`);
          semuaInput.forEach((inp, i) => log(`  [${i}] value="${inp.value}" placeholder="${inp.placeholder}" type="${inp.type}"`));

          // Index 1 = kolom harga maksimal (index 0 = kode produk)
          const inputHarga = semuaInput[1] || semuaInput[0];

          if (inputHarga) {
            // Klik dulu agar field aktif
            inputHarga.focus();
            inputHarga.click();
            await delay(200);

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(inputHarga, String(hargaSet));
            } else {
              inputHarga.value = String(hargaSet);
            }
            inputHarga.dispatchEvent(new Event('input', { bubbles: true }));
            inputHarga.dispatchEvent(new Event('change', { bubbles: true }));
            inputHarga.dispatchEvent(new Event('blur', { bubbles: true }));

            await delay(300);
            log(`✅ Harga Maksimal diset: Rp ${hargaSet} (nilai terbaca: ${inputHarga.value})`);

            // Verifikasi: pastikan nilai yang masuk benar
            const nilaiAkhir = Number(inputHarga.value.replace(/[^\d]/g, ""));
            if (nilaiAkhir < terbaik.harga) {
              log(`⚠️ PERINGATAN: Nilai input (${nilaiAkhir}) lebih kecil dari harga seller (${terbaik.harga})!`);
            }
          } else {
            log("GAGAL: Input harga maksimal tidak ditemukan di row.");
          }
        }
      }
    } else {
      log("SKIP: Tidak ada seller yang memenuhi kriteria.");
      const esc = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(esc);
      const close = document.querySelector(".close, .btn-close, [aria-label='Close'], [aria-label='Tutup']");
      if (close) close.click();
      else {
        const overlay = document.querySelector(".modal-backdrop, .overlay, [class*='backdrop' i]");
        if (overlay) overlay.click();
      }
    }

    await delay(CONFIG.jedaAntarProdukMs);
  }

  // ============================================================
  // FUNGSI UTAMA - mulai() dengan auto page size halaman utama
  // ============================================================
  async function mulai() {
    if (sedangBerjalan) return;
    sedangBerjalan = true;

    try {
      // LANGKAH 1: Baca total produk dari pagination
      const totalProduk = bacaTotalProdukDariPagination();
      log(`Total produk terdeteksi dari pagination: ${totalProduk}`);

      // LANGKAH 2: Ubah page size halaman utama ke 100/page
      const berhasil = await ubahPageSizeHalamanUtama(CONFIG.pageSizeHalamanUtama);

      let produk = [];

      if (berhasil) {
        // LANGKAH 3: Tunggu produk termuat semua
        const jumlahTarget = totalProduk > 0 ? Math.min(totalProduk, 100) : 20;
        produk = await tunggуProdukTermuat(jumlahTarget);
        log(`Produk siap diproses setelah ubah page size: ${produk.length}`);
      } else {
        // Fallback: langsung ambil produk yang ada sekarang
        log("Ubah page size gagal, lanjut dengan produk yang tampil saat ini.");
        produk = cariSemuaRowProduk();
      }

      if (!produk.length) {
        log("BERHENTI: Tidak ada produk ditemukan.");
        return;
      }

      log(`Total produk yang akan diproses: ${Math.min(produk.length, CONFIG.maksimalProdukDiproses)}`);

      // LANGKAH 4: Proses satu per satu
      for (let i = 0; i < Math.min(produk.length, CONFIG.maksimalProdukDiproses); i++) {
        await prosesSatuProduk(produk[i], i);
      }

      log("✅ Proses Selesai.");
    } finally {
      sedangBerjalan = false;
    }
  }

  document.addEventListener("AUTO_SELLER_MULAI", mulai);
  console.log("✅ Anti-Logout + Auto Page Size Aktif.");
  console.log("▶ Jalankan dengan: document.dispatchEvent(new CustomEvent('AUTO_SELLER_MULAI'))");
})();