// Isi dari Supabase: Project Settings → API Keys.
// Gunakan publishable key (atau legacy anon key), JANGAN secret/service_role key.
window.IURAN_CONFIG = {
  supabaseUrl: 'https://lbzwhgfoxugkdoesozci.supabase.co',
  supabasePublishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiendoZ2ZveHVna2RvZXNvemNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTI0NjAsImV4cCI6MjEwNjEyODQ2MH0.nMU9IJTrPcwAlFUxi7JxMwGfsJdJhY63d6U8RXcKxYc',
  // Isi data rekening resmi pengurus sebelum dipublikasikan. Nomor ini terlihat oleh semua pengunjung.
  bankName: 'BNI',
  bankAccountNumber: '1982363345',
  bankAccountHolder: 'Ikmal Falahi',
  // Letakkan foto tambahan di assets/galeri/, lalu tambahkan satu baris per foto.
  galleryImages: [
    {src: 'assets/Foto1.jpeg', alt: 'Dokumentasi kebersamaan Putera Delima pada tahun 2023', caption: 'Sejak 2023, kebersamaan ini terus tumbuh menjadi kenangan yang kita jaga bersama.'},
    {src: 'assets/Foto2.jpeg', alt: 'Dokumentasi kekompakan anggota Putera Delima dalam kegiatan masyarakat', caption: 'Kekompakan kita tak berhenti di panggung; semangatnya terasa hingga ke tengah masyarakat.'},
    {src: 'assets/Foto3.jpg', alt: 'Foto bersama anggota Putera Delima', caption: 'Setiap kali berkumpul, selalu ada cerita baru yang kelak kita rindukan.'},
    {src: 'assets/Foto4.jpg', alt: 'Momen kebersamaan anggota Putera Delima', caption: 'Waktu boleh berlalu, tetapi hangatnya pertemuan ini tetap tinggal dalam ingatan.'},
    {src: 'assets/Foto5.jpg', alt: 'Dokumentasi kegiatan bersama Putera Delima', caption: 'Dari langkah kecil yang dilakukan bersama, lahir kenangan yang begitu berarti.'},
    {src: 'assets/Foto6.jpg', alt: 'Anggota Putera Delima dalam kegiatan bersama', caption: 'Tawa, cerita, dan kebersamaan inilah yang membuat kita selalu ingin kembali.'},
    {src: 'assets/Foto7.jpg', alt: 'Kenangan kegiatan anggota Putera Delima', caption: 'Satu keluarga, banyak cerita, dan kenangan yang terus menyatukan kita.'},
  ]
};
