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
    {src: 'assets/foto1.jpeg', alt: 'Kebersamaan 2023', caption: 'Kegiatan rutin yang terus berkelanjutan.'},
    {src: 'assets/foto2.jpeg', alt: 'Kekompakan tidak cuma di panggung', caption: 'Kekompakan kita tunjukan kepada masyarakat'},
    {src: 'assets/foto3.jpg', alt: 'Kebersamaan anggota Putera Delima', caption: 'Bersama, kita membuat setiap pertemuan lebih berarti.'},
    {src: 'assets/foto4.jpg', alt: 'Kebersamaan anggota Putera Delima', caption: 'Bersama, kita membuat setiap pertemuan lebih berarti.'},
    {src: 'assets/foto5.jpg', alt: 'Kebersamaan anggota Putera Delima', caption: 'Bersama, kita membuat setiap pertemuan lebih berarti.'},
    {src: 'assets/foto6.jpg', alt: 'Kebersamaan anggota Putera Delima', caption: 'Bersama, kita membuat setiap pertemuan lebih berarti.'},
    {src: 'assets/foto7.jpg', alt: 'Kebersamaan anggota Putera Delima', caption: 'Bersama, kita membuat setiap pertemuan lebih berarti.'},
  ]
};
