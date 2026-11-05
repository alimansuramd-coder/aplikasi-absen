/**
 * Data structures for Teacher Attendance App (Absensi Guru Pintar)
 */

export interface Teacher {
  id: string;
  name: string;
  nip: string; // Nomor Induk Pegawai / NIK
  subject: string; // Mata Pelajaran / Jabatan
  jabatan?: string; // Sesuai kolom DataGuru Apps Script
  alamat?: string; // Sesuai kolom DataGuru Apps Script
  phone?: string;
  photoUrl: string; // Data URL / Base64 of face reference
  faceFeatures?: number[]; // Extracted biometric vector / descriptor
  descriptor?: number[]; // Biometric descriptor vector
  registeredAt: string;
  status: 'aktif' | 'cuti' | 'nonaktif';
}

export interface AttendanceRecord {
  id: string;
  waktuHariTanggal: string; // Kolom: Waktu Hari Tanggal (e.g., "Kamis, 05 November 2026")
  namaGuru: string; // Kolom: Nama Guru
  jamMasuk: string; // Kolom: Jam Masuk (e.g., "06:48:15 WIB")
  jamPulang: string; // Kolom: Jam Pulang (e.g., "14:15:00 WIB" or "-")
  titikKordinat: string; // Kolom: Titik Kordinat (e.g., "-6.2088, 106.8456")
  viewLokasi: string; // Kolom: View Lokasi (Google Maps URL)
  presensi: 'Masuk' | 'Pulang' | 'Terlambat' | 'Izin' | 'DL' | 'Sakit'; // Kolom: Presensi (termasuk Izin & DL)
  keterangan: string; // Kolom: Keterangan (e.g., "Hadir Tepat Waktu", "DL: Rapat Disdik OKI", "Izin: Sakit")
  
  // Internal tracking metadata
  teacherId: string;
  timestamp: number;
  type: 'masuk' | 'pulang' | 'izin' | 'dl';
  facePhotoUrl?: string; // Captured photo / surat tugas
  similarityScore?: number; // Face match %
  distanceMeters?: number; // Distance from school
  syncedToSheets: boolean;
  sheetsSyncTime?: string;
}

export interface SchoolConfig {
  schoolName: string;
  npsn?: string;
  address: string;
  jamMasuk: string; // e.g. "07:00"
  batasTerlambat: string; // e.g. "07:15"
  jamPulang: string; // e.g. "14:00"
  schoolLat: number;
  schoolLng: number;
  radiusMeter: number;
  strictGps: boolean; // Enforce presence within radius
}

export interface GoogleSheetsConfig {
  webhookUrl: string; // Google Apps Script Web App URL
  sheetName: string;
  autoSync: boolean;
  lastSyncStatus?: 'success' | 'failed' | 'idle' | 'syncing';
  lastSyncMessage?: string;
  lastSyncTime?: string;
}

export interface BiometricMatchResult {
  matched: boolean;
  confidence: number; // 0 to 100%
  teacher?: Teacher;
  message: string;
}
