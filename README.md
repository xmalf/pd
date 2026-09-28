# Sistem Iuran Halal Bihalal 1448 H — Putera Delima

Aplikasi statis tiga halaman: `index.html` untuk pengurus mencatat iuran, `rekap.html` untuk melihat hasilnya, dan `pengeluaran.html` untuk mencatat serta melihat biaya kegiatan. HTML, CSS, dan JavaScript biasa, tanpa proses build. Foto hero ada di `assets/hero-bg.jpg`.

## Menjalankan

1. Buat proyek Supabase. Di SQL Editor, jalankan seluruh isi `supabase.sql`.
2. Di Authentication > Users, buat akun pengurus dengan email dan kata sandi. Salin email itu, lalu jalankan perintah `insert into public.iuran_admins ...` yang dicontohkan di akhir `supabase.sql` dengan email pengurus yang sebenarnya. Pastikan akun sudah terkonfirmasi. Ulangi untuk pengurus lain.
3. Di `assets/config.js`, isi **Project URL** dan **publishable key** dari Supabase Project Settings > API Keys. Legacy `anon` key juga dapat dipakai. **Jangan pernah menaruh secret key atau service_role key dalam file situs.** URL dan publishable key memang akan terlihat publik; akses tulis diamankan oleh kebijakan RLS pada database.
4. Jika sudah memakai versi lama, jalankan ulang isi `supabase.sql` (aman untuk tabel yang sudah ada dan akan menambahkan tabel pengeluaran). Unggah isi folder ini ke akar repository GitHub. Aktifkan GitHub Pages melalui Settings > Pages > Deploy from a branch > main / (root). Setelah terbit, buka `index.html` untuk masuk dan menambahkan daftar anggota; buka `rekap.html` untuk rekap.

## Perilaku aplikasi

- Target setiap anggota Rp250.000, tetapi setoran di atas target tetap ditambahkan penuh ke total.
- Setiap pembayaran disimpan terpisah sehingga anggota dapat mencicil. Pengurus dapat menghapus pembayaran salah dari halaman input.
- Tambah banyak nama sekaligus: satu nama per baris. Nama yang sudah ada dilewati. Daftar awal belum diisi karena belum ada nama anggota yang diberikan.
- Halaman rekap bisa dibuka tanpa login dan menampilkan nama, nominal, serta riwayat iuran. Halaman input memerlukan login pengurus.
- Halaman pengeluaran dapat dibaca tanpa login; hanya pengurus yang dapat menambah atau menghapus catatan. Total pengeluaran dan sisa dana (total iuran dikurangi pengeluaran) juga tampil di rekap. Sisa dana bisa negatif jika pengeluaran lebih besar dari iuran.
- Setiap daftar (pembayaran, rekap anggota, dan pengeluaran) memiliki pagination dengan pilihan 10, 20, 50, atau 100 data per halaman. Pencarian dan filter rekap mengembalikan tampilan ke halaman pertama.
- Semua data disimpan di Supabase sehingga sama saat dibuka dari perangkat berbeda. Tombol reload browser memuat data terbaru.

## Berkas

- `index.html`: input iuran dan anggota, login pengurus.
- `rekap.html`: total, sisa dana, dan daftar anggota.
- `pengeluaran.html`: input dan daftar pengeluaran acara.
- `assets/style.css`: gaya kedua halaman.
- `assets/app.js`: logika UI dan koneksi Supabase.
- `assets/config.js`: isi koneksi proyek Supabase.
- `supabase.sql`: tabel dan aturan akses database.

Catatan: GitHub Pages hanya menyajikan file statis. Supabase tetap diperlukan agar data tersimpan lintas perangkat. Pustaka Supabase JavaScript dimuat dari CDN dan membutuhkan akses internet.
