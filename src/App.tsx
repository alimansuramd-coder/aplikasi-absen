import React, { useState, useEffect } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  FaceScanner 
} from './components/FaceScanner';
import { 
  AdminLoginModal 
} from './components/AdminLoginModal';
import { 
  AdminDashboard 
} from './components/AdminDashboard';
import { 
  ApkDistributionModal 
} from './components/ApkDistributionModal';
import { 
  PWAInstallBanner 
} from './components/PWAInstallBanner';
import { 
  Teacher, 
  AttendanceRecord, 
  SchoolConfig, 
  GoogleSheetsConfig 
} from './types';
import { 
  loadTeachers, 
  saveTeachers, 
  loadRecords, 
  saveRecords, 
  loadSchoolConfig, 
  saveSchoolConfig, 
  loadSheetsConfig, 
  saveSheetsConfig,
  formatIndonesianDate
} from './utils/storage';
import { getCurrentPosition, calculateDistance } from './utils/geolocation';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  ExternalLink, 
  Navigation, 
  Smartphone, 
  ShieldCheck, 
  Sparkles,
  QrCode,
  FileSpreadsheet
} from 'lucide-react';

export default function App() {
  // Primary States
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [school, setSchool] = useState<SchoolConfig>(loadSchoolConfig());
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(loadSheetsConfig());

  // Modal States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // GPS Tracking State
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsDistance, setGpsDistance] = useState<number | undefined>(undefined);

  // Load Initial Data on Mount
  useEffect(() => {
    setTeachers(loadTeachers());
    setRecords(loadRecords());
    setSchool(loadSchoolConfig());
    setSheetsConfig(loadSheetsConfig());

    // Register service worker if supported
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    // Monitor GPS
    const checkGps = async () => {
      const pos = await getCurrentPosition();
      setGpsActive(!pos.error);
      const dist = calculateDistance(pos.latitude, pos.longitude, school.schoolLat, school.schoolLng);
      setGpsDistance(dist);
    };

    checkGps();
    const gpsInterval = setInterval(checkGps, 20000);
    return () => clearInterval(gpsInterval);
  }, [school.schoolLat, school.schoolLng]);

  // Handlers for persistent storage updates
  const handleSaveTeachers = (newTeachers: Teacher[]) => {
    setTeachers(newTeachers);
    saveTeachers(newTeachers);
  };

  const handleSaveSchool = (newSchool: SchoolConfig) => {
    setSchool(newSchool);
    saveSchoolConfig(newSchool);
  };

  const handleSaveSheetsConfig = (newSheets: GoogleSheetsConfig) => {
    setSheetsConfig(newSheets);
    saveSheetsConfig(newSheets);
  };

  const handleAttendanceSuccess = (newRecord: AttendanceRecord) => {
    const updated = [newRecord, ...records];
    setRecords(updated);
    saveRecords(updated);
  };

  // Stats for today
  const todayStr = formatIndonesianDate();
  const todayRecords = records.filter((r) => r.waktuHariTanggal === todayStr);
  const hadirTepatWaktu = todayRecords.filter((r) => r.presensi === 'Masuk' && !r.keterangan.toLowerCase().includes('terlambat')).length;
  const terlambat = todayRecords.filter((r) => r.presensi === 'Terlambat').length;
  const pulang = todayRecords.filter((r) => r.presensi === 'Pulang').length;
  const totalIzin = todayRecords.filter((r) => r.presensi === 'Izin' || r.type === 'izin').length;
  const totalDl = todayRecords.filter((r) => r.presensi === 'DL' || r.type === 'dl').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* PWA In-App Install Prompt Banner */}
      <PWAInstallBanner />

      {/* Main Top Header */}
      <Header
        school={school}
        sheetsConfig={sheetsConfig}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoutAdmin={() => {
          setIsAdminLoggedIn(false);
          setIsAdminDashboardOpen(false);
        }}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        deviceMode={isAdminLoggedIn ? 'admin' : 'kiosk'}
        onToggleDeviceMode={() => setIsAdminLoginOpen(true)}
        gpsActive={gpsActive}
        gpsDistance={gpsDistance}
        onOpenApkModal={() => setIsApkModalOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-5">
        {/* Quick Stats Ticker for Today (Including Izin & DL) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-cyan-400 rounded-xl shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Guru</p>
              <p className="text-base font-bold text-white leading-none mt-0.5">{teachers.length}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Tepat Waktu</p>
              <p className="text-base font-bold text-emerald-400 leading-none mt-0.5">{hadirTepatWaktu}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Terlambat</p>
              <p className="text-base font-bold text-amber-400 leading-none mt-0.5">{terlambat}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl shrink-0">
              <span className="text-xs font-bold">IZ</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Izin/Sakit</p>
              <p className="text-base font-bold text-orange-400 leading-none mt-0.5">{totalIzin}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow flex items-center gap-2.5 col-span-2 sm:col-span-1">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl shrink-0">
              <span className="text-xs font-bold">DL</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Dinas Luar</p>
              <p className="text-base font-bold text-purple-400 leading-none mt-0.5">{totalDl}</p>
            </div>
          </div>
        </div>

        {/* The Central Face Scanner Component */}
        <FaceScanner
          teachers={teachers}
          school={school}
          sheetsConfig={sheetsConfig}
          onAttendanceSuccess={handleAttendanceSuccess}
        />

        {/* Live Attendance History Ticker (matching Google Sheets 8-column layout) */}
        <section className="bg-slate-900/80 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-sm sm:text-base">
                Riwayat Absensi Terkini (Data Google Sheets)
              </h3>
            </div>
            {isAdminLoggedIn ? (
              <button
                type="button"
                onClick={() => setIsAdminDashboardOpen(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline decoration-cyan-400/50"
              >
                Lihat Semua ({records.length})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdminLoginOpen(true)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Login untuk Rekap Lengkap
              </button>
            )}
          </div>

          {/* Cards for Recent Check-ins */}
          <div className="space-y-2">
            {records.slice(0, 4).map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={rec.facePhotoUrl || teachers.find((t) => t.name === rec.namaGuru)?.photoUrl || ''}
                      alt={rec.namaGuru}
                      className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 bg-slate-900"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">{rec.namaGuru}</h4>
                    <p className="text-[11px] text-slate-400">
                      {rec.waktuHariTanggal} • <span className="font-mono text-cyan-300 font-semibold">{rec.type === 'masuk' ? rec.jamMasuk : rec.jamPulang}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-between sm:justify-end">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rec.presensi === 'Terlambat'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : rec.presensi === 'Pulang'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : rec.presensi === 'Izin'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : rec.presensi === 'DL'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {rec.presensi}
                  </span>

                  <a
                    href={rec.viewLokasi}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white transition flex items-center gap-1 text-[11px]"
                    title="Buka View Lokasi di Google Maps"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Lokasi</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Multi-Device Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white">Pasang di Seluruh Smartphone Guru:</p>
              <p className="text-slate-400 text-[11px]">
                Aplikasi ini bisa dipasang di setiap HP guru tanpa perlu instalasi rumit. Registrasi guru tetap terkontrol via login admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsApkModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow shrink-0 flex items-center gap-1.5 transition active:scale-95"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Buka QR & Pasang APK</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-4 px-4 border-t border-slate-800/80 bg-slate-950 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-400">
          {school.schoolName} — Sistem Presensi Wajah & GPS Terintegrasi Google Sheets
        </p>
        <p className="text-[11px] mt-1 text-slate-600">
          Format Kolom: Waktu Hari Tanggal | Nama Guru | Jam Masuk | Jam Pulang | Titik Kordinat | View Lokasi | Presensi | Keterangan
        </p>
      </footer>

      {/* MODAL 1: Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={() => {
          setIsAdminLoggedIn(true);
          setIsAdminDashboardOpen(true);
        }}
      />

      {/* MODAL 2: Admin Dashboard Modal */}
      <AdminDashboard
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        teachers={teachers}
        records={records}
        school={school}
        sheetsConfig={sheetsConfig}
        onSaveTeachers={handleSaveTeachers}
        onSaveSchool={handleSaveSchool}
        onSaveSheetsConfig={handleSaveSheetsConfig}
        onOpenApkModal={() => {
          setIsAdminDashboardOpen(false);
          setIsApkModalOpen(true);
        }}
      />

      {/* MODAL 3: APK & PWA Distribution Modal */}
      <ApkDistributionModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        schoolName={school.schoolName}
      />
    </div>
  );
}
