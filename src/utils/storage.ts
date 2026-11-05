/**
 * Persistent Storage & Demo Seed Data for Indonesian Teacher Attendance App
 */

import { Teacher, AttendanceRecord, SchoolConfig, GoogleSheetsConfig } from '../types';

const STORAGE_KEYS = {
  TEACHERS: 'presensi_guru_teachers_v1',
  RECORDS: 'presensi_guru_records_v1',
  SCHOOL: 'presensi_guru_school_config_v1',
  SHEETS: 'presensi_guru_sheets_config_v1',
  DEVICE_MODE: 'presensi_guru_device_mode_v1', // 'admin' | 'kiosk'
};

// Generates an attractive stylized SVG face avatar for demo teachers
function createAvatarSvg(name: string, gender: 'm' | 'f', color: string): string {
  const initials = name
    .split(' ')
    .filter((w) => !w.includes('.'))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="grad_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="40" fill="url(#grad_${initials})"/>
    <circle cx="100" cy="85" r="42" fill="#fed7aa"/>
    ${
      gender === 'm'
        ? `<path d="M 60 70 Q 100 35 140 70 Q 100 50 60 70" fill="#1e293b"/>`
        : `<path d="M 52 75 Q 100 20 148 75 Q 148 115 135 125 Q 100 95 65 125 Z" fill="#047857"/>`
    }
    <circle cx="85" cy="82" r="5" fill="#1e293b"/>
    <circle cx="115" cy="82" r="5" fill="#1e293b"/>
    <path d="M 92 102 Q 100 110 108 102" fill="none" stroke="#e11d48" stroke-width="3" stroke-linecap="round"/>
    <path d="M 45 190 C 45 145 75 135 100 135 C 125 135 155 145 155 190 Z" fill="#3b82f6"/>
    <text x="100" y="185" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="20">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_SCHOOL: SchoolConfig = {
  schoolName: 'SDN 1 CAHYA MAJU',
  npsn: '10604521',
  address: 'Desa Cahya Maju, Kec. Lempuing, Kab. Ogan Komering Ilir',
  jamMasuk: '07:00',
  batasTerlambat: '07:15',
  jamPulang: '14:00',
  schoolLat: -3.856214,
  schoolLng: 104.987541,
  radiusMeter: 250,
  strictGps: false,
};

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  webhookUrl: '',
  sheetName: 'Sheet1',
  autoSync: true,
  lastSyncStatus: 'idle',
};

export const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: 'guru-001',
    name: 'IMAM WIDAYAT, S.Pd',
    nip: '19770110 200801 1 002',
    subject: 'Kepala Sekolah',
    jabatan: 'Kepala Sekolah',
    alamat: 'Desa Cahya Maju',
    phone: '0812-7890-1234',
    photoUrl: createAvatarSvg('Imam Widayat', 'm', '#1e40af'),
    registeredAt: '2026-01-05',
    status: 'aktif',
  },
  {
    id: 'guru-002',
    name: 'Siti Rohani, S.Pd.SD',
    nip: '19820514 200902 2 004',
    subject: 'Guru Kelas V',
    jabatan: 'Guru Kelas V',
    alamat: 'Desa Cahya Maju',
    phone: '0813-6789-2345',
    photoUrl: createAvatarSvg('Siti Rohani', 'f', '#059669'),
    registeredAt: '2026-01-08',
    status: 'aktif',
  },
  {
    id: 'guru-003',
    name: 'Ahmad Subhan, S.Pd',
    nip: '19890912 201403 1 002',
    subject: 'Guru PJOK / Olahraga',
    jabatan: 'Guru PJOK',
    alamat: 'Desa Cahya Maju',
    phone: '0852-6789-0123',
    photoUrl: createAvatarSvg('Ahmad Subhan', 'm', '#dc2626'),
    registeredAt: '2026-01-10',
    status: 'aktif',
  },
  {
    id: 'guru-004',
    name: 'Nur Aini, S.Pd.I',
    nip: '19910405 201902 2 007',
    subject: 'Guru Pendidikan Agama Islam',
    jabatan: 'Guru PAI',
    alamat: 'Desa Cahya Maju',
    phone: '0821-8901-2345',
    photoUrl: createAvatarSvg('Nur Aini', 'f', '#7c3aed'),
    registeredAt: '2026-01-12',
    status: 'aktif',
  },
  {
    id: 'guru-005',
    name: 'Bambang Irawan, S.Pd.SD',
    nip: '19860718 201001 1 015',
    subject: 'Guru Kelas IV',
    jabatan: 'Guru Kelas IV',
    alamat: 'Desa Cahya Maju',
    phone: '0813-7890-5678',
    photoUrl: createAvatarSvg('Bambang Irawan', 'm', '#d97706'),
    registeredAt: '2026-01-15',
    status: 'aktif',
  },
];

// Helper to format Indonesian day and date: e.g. "Kamis, 05 November 2026"
export function formatIndonesianDate(d: Date = new Date()): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const dayName = days[d.getDay()];
  const dateNum = d.getDate().toString().padStart(2, '0');
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${dateNum} ${monthName} ${year}`;
}

export function formatIndonesianTime(d: Date = new Date()): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss} WIB`;
}

// Generate sample attendance records for today
function getInitialRecords(): AttendanceRecord[] {
  const todayStr = formatIndonesianDate();
  return [
    {
      id: 'rec-001',
      waktuHariTanggal: todayStr,
      namaGuru: 'IMAM WIDAYAT, S.Pd',
      jamMasuk: '06:42:10 WIB',
      jamPulang: '-',
      titikKordinat: '-3.856214, 104.987541',
      viewLokasi: 'https://www.google.com/maps?q=-3.856214,104.987541',
      presensi: 'Masuk',
      keterangan: 'Hadir Tepat Waktu (Radius 10m)',
      teacherId: 'guru-001',
      timestamp: Date.now() - 3600 * 1000 * 3,
      type: 'masuk',
      similarityScore: 97,
      distanceMeters: 10,
      syncedToSheets: true,
      sheetsSyncTime: '06:42:12 WIB',
    },
    {
      id: 'rec-002',
      waktuHariTanggal: todayStr,
      namaGuru: 'Siti Rohani, S.Pd.SD',
      jamMasuk: '06:51:24 WIB',
      jamPulang: '-',
      titikKordinat: '-3.856220, 104.987550',
      viewLokasi: 'https://www.google.com/maps?q=-3.856220,104.987550',
      presensi: 'Masuk',
      keterangan: 'Hadir Tepat Waktu (Radius 15m)',
      teacherId: 'guru-002',
      timestamp: Date.now() - 3600 * 1000 * 2.5,
      type: 'masuk',
      similarityScore: 95,
      distanceMeters: 15,
      syncedToSheets: true,
      sheetsSyncTime: '06:51:26 WIB',
    },
    {
      id: 'rec-003',
      waktuHariTanggal: todayStr,
      namaGuru: 'Ahmad Subhan, S.Pd',
      jamMasuk: '07:22:05 WIB',
      jamPulang: '-',
      titikKordinat: '-3.856210, 104.987535',
      viewLokasi: 'https://www.google.com/maps?q=-3.856210,104.987535',
      presensi: 'Terlambat',
      keterangan: 'Terlambat 7 Menit (Batas 07:15)',
      teacherId: 'guru-003',
      timestamp: Date.now() - 3600 * 1000 * 2,
      type: 'masuk',
      similarityScore: 93,
      distanceMeters: 12,
      syncedToSheets: true,
      sheetsSyncTime: '07:22:08 WIB',
    },
  ];
}

// Storage accessor functions
export function loadTeachers(): Teacher[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  saveTeachers(DEFAULT_TEACHERS);
  return DEFAULT_TEACHERS;
}

export function saveTeachers(teachers: Teacher[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  } catch (err) {
    console.error('Failed to save teachers to localStorage:', err);
  }
}

export function loadRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const init = getInitialRecords();
  saveRecords(init);
  return init;
}

export function saveRecords(records: AttendanceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save records to localStorage:', err);
  }
}

export function loadSchoolConfig(): SchoolConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHOOL);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_SCHOOL;
}

export function saveSchoolConfig(config: SchoolConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHOOL, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save school config:', err);
  }
}

export function loadSheetsConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHEETS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_SHEETS_CONFIG;
}

export function saveSheetsConfig(config: GoogleSheetsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SHEETS, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save sheets config:', err);
  }
}

export function loadDeviceMode(): 'admin' | 'kiosk' {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEVICE_MODE);
    if (raw === 'admin' || raw === 'kiosk') return raw;
  } catch {
    // ignore
  }
  return 'admin';
}

export function saveDeviceMode(mode: 'admin' | 'kiosk'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DEVICE_MODE, mode);
  } catch {
    // ignore
  }
}
