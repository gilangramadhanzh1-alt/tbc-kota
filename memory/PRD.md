# PRD — Bank Data Tuberkulosis Kota Sukabumi

## Original problem statement
Aplikasi bank data tuberkulosis sekota sukabumi , didalam nya ada data 1. SPM "Terduga TBC, 2. Treatment Coverage, 3. Keberhasilan Pengobatan , 4. Enrollment TB SO, 5. Penemuan Kasus TB RO, 6. Enrollment TB RO , 7. Keberhasilan TB RO , 8. TBC Anak, 9. TBC HIV, 10. TPT, 11. Investigasi Kontak " ini di bagi 2 Investigasi Kontak Bakteriologis dan Investigasi Kontak Klinis,  , tiap Point memuat data Per Keluarhan dan faskes, masukan juga target angka, target persen, capaian angka, capaian persen , total capaian angka, total capain persen

User choices: input manual via form (editable); admin login for input, public view only; target tahunan diinput, capaian per bulan, triwulan/semester/tahunan otomatis; dashboard grafik + export Excel; grafik bisa di download. Daftar 33 kelurahan & 25 faskes diberikan user.

## Architecture
- FastAPI + MongoDB (collections: users, units, targets, capaian, login_attempts), JWT Bearer auth (admin seeded from env).
- React + shadcn + recharts; xlsx (Excel export), html-to-image (PNG chart download).
- Period target = target tahunan × (jumlah bulan/12); capaian % = capaian / target periode × 100; total = sum semua unit.

## User personas
- Admin Dinkes (input/edit data), publik/pimpinan (lihat dashboard).

## Implemented (2026-10-12)
- Dashboard 12 indikator, filter tahun/periode (bulan/triwulan/semester/tahunan)/basis (kelurahan/faskes), grafik + unduh PNG, export Excel rekap.
- Detail indikator: tab per kelurahan/faskes, tabel target angka/%, capaian angka/%, baris total, grafik per unit & tren bulanan (unduh PNG), export Excel.
- Admin: login, grid input target tahunan + target % + capaian 12 bulan, master data kelurahan & faskes CRUD.
- Tested: backend 24/24, frontend core flows pass.

## Implemented (2026-10-12, sesi 2)
- Basis Kelurahan TANPA target: hanya 2 indikator (Treatment Coverage, Penemuan Kasus TB RO), hanya capaian angka (dashboard, detail, tabel, grafik, Excel, admin input). Faskes tetap 12 indikator lengkap. Backend `indicators_for()`, `GET /api/indicators?unit_type=`.
- Dokumen Pendukung per indikator & tahun (Emergent Object Storage, `backend/storage.py`): `POST /api/documents` (admin, multipart, PDF/Excel/Word/CSV ≤15MB), `GET /api/documents`, `GET /api/documents/{id}/download` (publik), `DELETE /api/documents/{id}` (soft delete). UI `DocumentPanel.jsx` di halaman detail indikator.
- Branding diganti "DATA TBC KOTA SUKABUMI" (sidebar, H1, login, title, header Excel).
- Tested: backend 33/33, frontend flows pass (iteration_2.json).
- Urutan indikator diubah: 3. Enrollment TB SO, 4. Keberhasilan Pengobatan (sidebar, dashboard, dropdown mengikuti otomatis dari backend INDICATORS). untuk indikator Treatment Coverage & Penemuan Kasus TB RO: baris tanpa target, hanya capaian angka 12 bulan; ikut dijumlahkan ke Total Capaian Kota & tren; tampil di basis Faskes dan Kelurahan; input di grid admin (target nonaktif); Excel menandai "(tanpa target)". ditampilkan eksplisit di kartu dashboard, kolom tabel rekap, stat detail indikator ("Target Kota {tahun}" + "Target Periode"), footer admin input, dan header Excel. Hanya untuk basis Faskes. Capaian % = capaian ÷ target periode.

## Backlog
- P1: Import Excel massal; riwayat perubahan (audit log); beberapa akun admin/operator per faskes.
- P2: Perbandingan antar tahun; peta kelurahan; mode gelap.
